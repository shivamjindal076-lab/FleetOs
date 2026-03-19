export interface Driver {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  rating: number;
  car: string;
  licensePlate: string;
  status: 'free' | 'on-trip' | 'offline';
  location: { lat: number; lng: number };
}

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  pickup: string;
  drop: string;
  tripType: 'city' | 'airport' | 'sightseeing' | 'outstation';
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  fare: number;
  driverId?: string;
  driverName?: string;
  scheduledAt?: string;
  createdAt: string;
  eta?: string;
  distance?: string;
}

export const mockDrivers: Driver[] = [
  { id: '1', name: 'Ramesh Kumar', phone: '+91 98291 45678', avatar: 'RK', rating: 4.8, car: 'Toyota Etios', licensePlate: 'RJ-14-CA-1234', status: 'free', location: { lat: 26.9124, lng: 75.7873 } },
  { id: '2', name: 'Suresh Sharma', phone: '+91 98292 56789', avatar: 'SS', rating: 4.6, car: 'Maruti Dzire', licensePlate: 'RJ-14-CB-5678', status: 'on-trip', location: { lat: 26.8855, lng: 75.8091 } },
  { id: '3', name: 'Mahesh Yadav', phone: '+91 98293 67890', avatar: 'MY', rating: 4.9, car: 'Honda City', licensePlate: 'RJ-14-CC-9012', status: 'free', location: { lat: 26.9260, lng: 75.7994 } },
  { id: '4', name: 'Dinesh Meena', phone: '+91 98294 78901', avatar: 'DM', rating: 4.5, car: 'Toyota Innova', licensePlate: 'RJ-14-CD-3456', status: 'on-trip', location: { lat: 26.8500, lng: 75.7600 } },
  { id: '5', name: 'Rajesh Patel', phone: '+91 98295 89012', avatar: 'RP', rating: 4.7, car: 'Maruti Ertiga', licensePlate: 'RJ-14-CE-7890', status: 'offline', location: { lat: 26.9000, lng: 75.7800 } },
  { id: '6', name: 'Vikas Singh', phone: '+91 98296 90123', avatar: 'VS', rating: 4.4, car: 'Hyundai Xcent', licensePlate: 'RJ-14-CF-2345', status: 'free', location: { lat: 26.9180, lng: 75.7700 } },
];

export const mockBookings: Booking[] = [
  { id: 'B001', customerId: 'C1', customerName: 'Priya Gupta', customerPhone: '+91 99876 54321', pickup: 'C-Scheme, Jaipur', drop: 'Malviya Nagar, Jaipur', tripType: 'city', status: 'pending', fare: 180, createdAt: '2026-03-06T08:30:00', eta: '12 min', distance: '6.2 km' },
  { id: 'B002', customerId: 'C2', customerName: 'Amit Jain', customerPhone: '+91 99876 12345', pickup: 'MI Road, Jaipur', drop: 'Jaipur Airport', tripType: 'airport', status: 'confirmed', fare: 450, driverId: '2', driverName: 'Suresh Sharma', scheduledAt: '2026-03-06T14:00:00', createdAt: '2026-03-06T07:00:00', eta: '35 min', distance: '14 km' },
  { id: 'B003', customerId: 'C3', customerName: 'Neha Verma', customerPhone: '+91 99876 67890', pickup: 'Hotel Marriott, Jaipur', drop: 'Amber Fort → City Palace → Hawa Mahal', tripType: 'sightseeing', status: 'in-progress', fare: 2200, driverId: '4', driverName: 'Dinesh Meena', scheduledAt: '2026-03-06T09:00:00', createdAt: '2026-03-05T20:00:00', eta: '4 hrs remaining', distance: '45 km tour' },
  { id: 'B004', customerId: 'C4', customerName: 'Rohit Saxena', customerPhone: '+91 99876 11111', pickup: 'Vaishali Nagar, Jaipur', drop: 'Delhi (Connaught Place)', tripType: 'outstation', status: 'confirmed', fare: 3200, driverId: '1', driverName: 'Ramesh Kumar', scheduledAt: '2026-03-07T05:30:00', createdAt: '2026-03-05T18:00:00', eta: '5 hrs', distance: '280 km' },
  { id: 'B005', customerId: 'C5', customerName: 'Kavita Rathore', customerPhone: '+91 99876 22222', pickup: 'Tonk Road, Jaipur', drop: 'Ajmer', tripType: 'outstation', status: 'pending', fare: 1800, scheduledAt: '2026-03-07T10:00:00', createdAt: '2026-03-06T06:00:00', eta: '2.5 hrs', distance: '135 km' },
  { id: 'B006', customerId: 'C6', customerName: 'Sanjay Agarwal', customerPhone: '+91 99876 33333', pickup: 'Mansarovar, Jaipur', drop: 'Udaipur', tripType: 'outstation', status: 'confirmed', fare: 4500, driverId: '3', driverName: 'Mahesh Yadav', scheduledAt: '2026-03-08T06:00:00', createdAt: '2026-03-06T09:00:00', eta: '6 hrs', distance: '395 km' },
];

export const tripTypeLabels: Record<string, string> = {
  city: 'City Ride',
  airport: 'Airport Transfer',
  sightseeing: 'Sightseeing',
  outstation: 'Outstation',
};

export const tripTypeIcons: Record<string, string> = {
  city: '🚗',
  airport: '✈️',
  sightseeing: '🏛️',
  outstation: '🛣️',
};

export const popularRoutes = [
  { from: 'Jaipur', to: 'Delhi', distance: '280 km', fare: '₹3,200', duration: '5 hrs' },
  { from: 'Jaipur', to: 'Udaipur', distance: '395 km', fare: '₹4,500', duration: '6 hrs' },
  { from: 'Jaipur', to: 'Ajmer', distance: '135 km', fare: '₹1,800', duration: '2.5 hrs' },
  { from: 'Jaipur', to: 'Jodhpur', distance: '335 km', fare: '₹4,000', duration: '5.5 hrs' },
];
