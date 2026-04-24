export const fetchCameras = async () => {
  return [{ id: 'cam1', latitude: 28.5383, longitude: -81.3792, direction: 'Northbound', status: 'Active' }];
};
export const fetchIncidents = async () => {
  return { incidents: [{ id: 'inc1', lat: 28.5400, lng: -81.3800, severity: 'Major', description: 'Accident on I-4' }] };
};
export default { fetchCameras, fetchIncidents };