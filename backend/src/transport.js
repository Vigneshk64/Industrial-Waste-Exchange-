/**
 * Transport Cost Estimation Module
 * Part of System Architecture: Mapping / Routing & Transport Cost Estimation
 */

function estimateDistance(originCity = '', destinationCity = '') {
  const normOrigin = originCity.toLowerCase().trim();
  const normDest = destinationCity.toLowerCase().trim();

  if (!normOrigin || !normDest) return 50; // default average
  if (normOrigin === normDest) return 15; // intra-city transit

  // Benchmark Indian industrial corridor distance heuristics (km)
  const knownDistances = {
    'pune-mumbai': 150,
    'mumbai-pune': 150,
    'pune-nashik': 210,
    'nashik-pune': 210,
    'mumbai-vapi': 170,
    'vapi-mumbai': 170,
    'ahmedabad-vapi': 350,
    'vapi-ahmedabad': 350,
    'pune-nagpur': 710,
    'nagpur-pune': 710,
    'hyderabad-pune': 560,
    'pune-hyderabad': 560,
    'bengaluru-chennai': 350,
    'chennai-bengaluru': 350,
  };

  const key1 = `${normOrigin.split(',')[0].trim()}-${normDest.split(',')[0].trim()}`;
  if (knownDistances[key1]) return knownDistances[key1];

  return 120; // default inter-city benchmark
}

function estimateTransportCost({ origin, destination, weightKg = 1000, vehicleType = 'standard' }) {
  const distanceKm = estimateDistance(origin, destination);
  
  // Rate matrix based on weight and vehicle requirements
  let ratePerKm = 35; // base rate in INR per km
  let baseHandling = 1200; // loading/unloading overhead

  if (weightKg > 5000) {
    ratePerKm = 65; // Heavy Commercial Vehicle (HCV)
    baseHandling = 2500;
  } else if (weightKg > 2000) {
    ratePerKm = 48; // Medium Commercial Vehicle (MCV)
    baseHandling = 1800;
  }

  const fuelSurcharge = distanceKm * 4.5;
  const estimatedCost = Math.round(baseHandling + (distanceKm * ratePerKm) + fuelSurcharge);

  return {
    distance_km: distanceKm,
    estimated_cost: estimatedCost,
    vehicle_type: weightKg > 5000 ? 'HCV 10-Wheeler' : weightKg > 2000 ? 'MCV 6-Wheeler' : 'Light Commercial (LCV)',
    currency: 'INR',
    formula: `Base Handling (₹${baseHandling}) + (₹${ratePerKm}/km * ${distanceKm}km) + Fuel Surcharge`,
  };
}

module.exports = {
  estimateDistance,
  estimateTransportCost,
};

