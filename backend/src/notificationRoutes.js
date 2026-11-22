const express = require('express');
const { adminSupabase } = require('./adminSupabase');
const { requireAuth, requireCompany } = require('./authMiddleware');

function createNotificationRouter(dependencies = {}) {
  const client = dependencies.adminSupabase || adminSupabase;
  const router = express.Router();
  router.use(dependencies.requireAuth || requireAuth, dependencies.requireCompany || requireCompany);

  router.get('/', async (req, res) => {
    try {
      const { data, error } = await client.from('notifications')
        .select('id, recipient_company_id, actor_company_id, request_id, title, message, created_at, read_at')
        .eq('recipient_company_id', req.company.id)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      const { count: unreadCount, error: countError } = await client.from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_company_id', req.company.id)
        .is('read_at', null);
      if (countError) throw countError;

      const notifications = data || [];
      const actorIds = [...new Set(notifications.map((item) => item.actor_company_id).filter(Boolean))];
      const requestIds = [...new Set(notifications.map((item) => item.request_id).filter(Boolean))];
      const [companiesResult, requestsResult] = await Promise.all([
        actorIds.length
          ? client.from('companies').select('id, name').in('id', actorIds)
          : Promise.resolve({ data: [], error: null }),
        requestIds.length
          ? client.from('exchange_requests').select('id, material_name, quantity_requested').in('id', requestIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (companiesResult.error) throw companiesResult.error;
      if (requestsResult.error) throw requestsResult.error;
      const companies = new Map((companiesResult.data || []).map((company) => [company.id, company]));
      const requests = new Map((requestsResult.data || []).map((request) => [request.id, request]));

      return res.json({
        recipient_company_id: req.company.id,
        unread_count: unreadCount || 0,
        notifications: notifications.map((item) => ({
          ...item,
          buyer_company_name: companies.get(item.actor_company_id)?.name || 'Buyer company',
          material_name: requests.get(item.request_id)?.material_name || 'Material listing',
        })),
      });
    } catch (error) {
      console.error('Notification list failed:', error.message);
      return res.status(500).json({ error: 'Unable to load notifications.' });
    }
  });

  router.patch('/:id/read', async (req, res) => {
    try {
      const { data, error } = await client.from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .eq('recipient_company_id', req.company.id)
        .is('read_at', null)
        .select('id, read_at')
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        const { data: existing, error: existingError } = await client.from('notifications')
          .select('id, read_at')
          .eq('id', req.params.id)
          .eq('recipient_company_id', req.company.id)
          .maybeSingle();
        if (existingError) throw existingError;
        if (!existing) return res.status(404).json({ error: 'Notification not found.' });
        return res.json(existing);
      }
      return res.json(data);
    } catch (error) {
      console.error('Notification read update failed:', error.message);
      return res.status(500).json({ error: 'Unable to update notification.' });
    }
  });

  return router;
}

module.exports = createNotificationRouter();
module.exports.createNotificationRouter = createNotificationRouter;
