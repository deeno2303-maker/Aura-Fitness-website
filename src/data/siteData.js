export const defaultSiteContent = {
  disciplines: [
  { number: '01', label: 'Strength', icon: 'fitness_center', variant: 'discipline-strength' },
  { number: '02', label: 'Conditioning', icon: 'ecg_heart', variant: 'discipline-conditioning' },
  { number: '03', label: 'Mobility', icon: 'self_improvement', variant: 'discipline-mobility' }
  ],

  scheduleRows: [
  {
    time: '06:00',
    Mon: 'Strength',
    Tue: 'Conditioning',
    Wed: 'Strength',
    Thu: 'Conditioning',
    Fri: 'Strength',
    Sat: 'Mobility'
  },
  {
    time: '09:15',
    Mon: 'Mobility',
    Tue: 'Strength',
    Wed: 'Mobility',
    Thu: 'Strength',
    Fri: 'Conditioning',
    Sat: '—'
  },
  {
    time: '12:15',
    Mon: 'Express HIIT',
    Tue: 'Strength',
    Wed: 'Express HIIT',
    Thu: 'Strength',
    Fri: 'Express HIIT',
    Sat: '—'
  },
  {
    time: '17:30',
    Mon: 'Strength',
    Tue: 'Mobility',
    Wed: 'Strength',
    Thu: 'Mobility',
    Fri: 'Conditioning',
    Sat: 'Open gym'
  },
  {
    time: '19:00',
    Mon: 'Mobility',
    Tue: 'Conditioning',
    Wed: 'Mobility',
    Thu: 'Conditioning',
    Fri: '—',
    Sat: '—'
  }
  ],

  trainerProfiles: [
  {
    initials: 'LN',
    name: 'Logan Nair',
    role: 'Head coach · Strength',
    bio: '12 years under the bar. Logan runs the strength program and insists on perfect hinges before heavy deadlifts.',
    variant: 'trainer-strength'
  },
  {
    initials: 'MW',
    name: 'Mubeen Wahab',
    role: 'Conditioning',
    bio: "Former 800m national squad. Mubeen's HIIT blocks are short, brutal, and weirdly fun.",
    variant: 'trainer-conditioning'
  },
  {
    initials: 'NW',
    name: 'Nabiha Wahab',
    role: 'Mobility · Rehab',
    bio: 'Physio-turned-coach. Nabiha keeps the whole studio moving well and coming back from injuries stronger.',
    variant: 'trainer-mobility'
  },
  {
    initials: 'ME',
    name: 'Muzzammil Essop',
    role: 'Strength · Beginners',
    bio: 'Muzzammil onboards every new member. Patient, precise, and allergic to bad squat depth.',
    variant: 'trainer-strength'
  }
  ],

  membershipPlans: [
  {
    title: 'Off-peak',
    price: 'R650',
    featured: false,
    buttonVariant: 'outlined',
    buttonText: 'Choose off-peak',
    features: ['Classes before 16:00', 'Open gym Saturdays', '1 guest pass per month']
  },
  {
    title: 'All access',
    price: 'R890',
    featured: true,
    badge: 'Most popular',
    buttonVariant: 'filled',
    buttonText: 'Choose all access',
    features: ['Unlimited classes, any time', 'Open gym 7 days a week', 'Monthly movement screen', '2 guest passes per month']
  },
  {
    title: 'Coached+',
    price: 'R1 450',
    featured: false,
    buttonVariant: 'outlined',
    buttonText: 'Choose coached+',
    features: ['Everything in All access', '1-on-1 session every month', 'Personalised program']
  }
  ],

};

export const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const bookingOptions = ['Strength', 'Conditioning', 'Mobility'];
