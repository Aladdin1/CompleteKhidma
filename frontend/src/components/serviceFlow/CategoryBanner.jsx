import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { services } from '@/data/services';
import { getCategoryInfo } from '@/data/categoryInfo';

const CategoryBanner = ({ categoryInfo, onChangeCategory, i18n }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const isAr = i18n?.language === 'ar';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      <div
        className="step-card flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
        style={{
          background: categoryInfo.bgColor,
          borderColor: `${categoryInfo.color}30`,
        }}
        onClick={() => onChangeCategory && setShowDropdown(!showDropdown)}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm"
          style={{ backgroundColor: `${categoryInfo.color}20` }}
        >
          {categoryInfo.emoji}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground">
              {isAr ? categoryInfo.nameAr : categoryInfo.name}
            </h2>
            {onChangeCategory && (
              <motion.div
                animate={{ rotate: showDropdown ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              </motion.div>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            {isAr ? categoryInfo.descriptionAr : categoryInfo.description}
          </p>
          <span
            className="inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full text-white"
            style={{ backgroundColor: categoryInfo.color }}
          >
            {categoryInfo.priceRange}
          </span>
        </div>
      </div>

      {showDropdown && onChangeCategory && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-full left-0 right-0 mt-2 bg-card rounded-xl shadow-medium-flow border border-border z-20 overflow-hidden"
        >
          {services.map((s) => {
            const info = getCategoryInfo(s);
            return (
              <div
                key={info.id}
                className={`flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-muted ${
                  info.id === categoryInfo.id ? 'bg-accent' : ''
                }`}
                onClick={() => {
                  onChangeCategory(info);
                  setShowDropdown(false);
                }}
              >
                <span className="text-2xl">{info.emoji}</span>
                <div>
                  <p className="font-medium text-foreground">
                    {isAr ? info.nameAr : info.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{info.priceRange}</p>
                </div>
              </div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
};

export default CategoryBanner;
