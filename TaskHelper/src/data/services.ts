export interface Service {
  id: string;
  name: string;
  description: string;
  icon: string;
  image: string;
  averagePrice: string;
  popularTasks: string[];
}

export const services: Service[] = [
  {
    id: 'mounting',
    name: 'Mounting & Installation',
    description: 'Hang shelves, mount TVs, install furniture',
    icon: '🔧',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400',
    averagePrice: '$60-120',
    popularTasks: [
      'TV Mounting',
      'Shelf Installation',
      'Curtain Rod Hanging',
      'Picture Frame Mounting',
      'Mirror Installation'
    ]
  },
  {
    id: 'moving',
    name: 'Moving & Packing',
    description: 'Help with moving, packing, and heavy lifting',
    icon: '📦',
    image: 'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=400',
    averagePrice: '$80-150',
    popularTasks: [
      'Moving Help',
      'Packing Services',
      'Furniture Rearrangement',
      'Heavy Lifting',
      'Truck Loading/Unloading'
    ]
  },
  {
    id: 'cleaning',
    name: 'Cleaning',
    description: 'Deep cleaning, regular cleaning, organization',
    icon: '🧹',
    image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400',
    averagePrice: '$70-130',
    popularTasks: [
      'Deep Cleaning',
      'Regular House Cleaning',
      'Move-in/Move-out Cleaning',
      'Organization',
      'Laundry Help'
    ]
  },
  {
    id: 'handyman',
    name: 'Handyman',
    description: 'General repairs and home maintenance',
    icon: '🔨',
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400',
    averagePrice: '$65-125',
    popularTasks: [
      'General Repairs',
      'Furniture Assembly',
      'Door Installation',
      'Painting Touch-ups',
      'Weather Stripping'
    ]
  },
  {
    id: 'delivery',
    name: 'Delivery',
    description: 'Pick up and deliver items across town',
    icon: '🚚',
    image: 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=400',
    averagePrice: '$40-90',
    popularTasks: [
      'Furniture Delivery',
      'Grocery Delivery',
      'Package Pickup',
      'Donation Drop-off',
      'Item Transport'
    ]
  },
  {
    id: 'yard-work',
    name: 'Yard Work',
    description: 'Lawn care, gardening, and outdoor tasks',
    icon: '🌿',
    image: 'https://images.unsplash.com/photo-1558904541-efa843a96f01?w=400',
    averagePrice: '$55-110',
    popularTasks: [
      'Lawn Mowing',
      'Gardening',
      'Weeding',
      'Leaf Removal',
      'Snow Removal'
    ]
  },
  {
    id: 'furniture-assembly',
    name: 'Furniture Assembly',
    description: 'Assemble IKEA and other furniture',
    icon: '🪑',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400',
    averagePrice: '$50-100',
    popularTasks: [
      'IKEA Assembly',
      'Desk Assembly',
      'Bed Frame Assembly',
      'Bookshelf Assembly',
      'Office Furniture'
    ]
  },
  {
    id: 'errands',
    name: 'Errands',
    description: 'Shopping, returns, waiting in line',
    icon: '🛍️',
    image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400',
    averagePrice: '$35-75',
    popularTasks: [
      'Grocery Shopping',
      'Wait in Line',
      'Returns & Exchanges',
      'Prescription Pickup',
      'Post Office Run'
    ]
  }
];
