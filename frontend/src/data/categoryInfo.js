// Category info for service flow (colors and display) - derived from services.js
const COLOR_MAP = {
  cleaning: { color: 'hsl(174 72% 40%)', bgColor: 'hsl(174 50% 95%)' },
  mounting: { color: 'hsl(262 70% 55%)', bgColor: 'hsl(262 50% 95%)' },
  moving: { color: 'hsl(220 70% 50%)', bgColor: 'hsl(220 50% 95%)' },
  assembly: { color: 'hsl(32 95% 55%)', bgColor: 'hsl(32 80% 95%)' },
  delivery: { color: 'hsl(142 72% 40%)', bgColor: 'hsl(142 50% 95%)' },
  handyman: { color: 'hsl(22 90% 55%)', bgColor: 'hsl(22 80% 95%)' },
  painting: { color: 'hsl(330 70% 55%)', bgColor: 'hsl(330 50% 95%)' },
  plumbing: { color: 'hsl(200 80% 50%)', bgColor: 'hsl(200 60% 95%)' },
  electrical: { color: 'hsl(45 93% 47%)', bgColor: 'hsl(45 80% 95%)' },
};

export function getCategoryInfo(service) {
  if (!service) return null;
  const { color, bgColor } = COLOR_MAP[service.id] || { color: 'hsl(174 72% 40%)', bgColor: 'hsl(174 50% 95%)' };
  return {
    id: service.id,
    name: service.name,
    nameAr: service.nameAr,
    description: service.description,
    descriptionAr: service.descriptionAr,
    emoji: service.icon,
    priceRange: service.averagePrice,
    color,
    bgColor,
  };
}
