import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FileText, ImagePlus, X, Sparkles, Video } from 'lucide-react';

const QUICK_TASKS = {
  cleaning: ['Deep clean apartment', 'Organize closet', 'Kitchen deep clean', 'Bathroom cleaning'],
  assembly: ['IKEA furniture', 'Office desk assembly', 'Wardrobe setup', 'Bed frame assembly'],
  mounting: ['Mount TV on wall', 'Install shelves', 'Hang mirrors', 'Install curtain rods'],
  moving: ['Help move furniture', 'Pack boxes', 'Load/unload truck', 'Rearrange furniture'],
  delivery: ['Pick up package', 'Grocery delivery', 'Store pickup', 'Document delivery'],
  handyman: ['Fix door handle', 'Repair faucet', 'Fix electrical', 'General repairs'],
  painting: ['Paint bedroom', 'Touch up walls', 'Paint furniture', 'Exterior painting'],
  plumbing: ['Fix leak', 'Unclog drain', 'Install faucet', 'Toilet repair'],
  electrical: ['Light installation', 'Outlet installation', 'Wiring repairs', 'Ceiling fan'],
};

const TaskDetailsForm = ({
  categoryInfo,
  title,
  description,
  images,
  onTitleChange,
  onDescriptionChange,
  onImagesChange,
  i18n,
}) => {
  const fileInputRef = useRef(null);
  const quickTasks = QUICK_TASKS[categoryInfo?.id] || [];
  const isAr = i18n?.language === 'ar';

  const handleMediaUpload = (e) => {
    const files = Array.from(e.target.files || []);
    onImagesChange([...images, ...files].slice(0, 5));
  };

  const removeMedia = (index) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  const isVideoFile = (file) => file.type.startsWith('video/');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-foreground">{isAr ? 'اختيار سريع' : 'Quick select'}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickTasks.map((task) => (
            <button
              key={task}
              type="button"
              onClick={() => onTitleChange(task)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                title === task
                  ? 'bg-teal-600 text-white'
                  : 'bg-muted text-foreground hover:bg-accent'
              }`}
            >
              {task}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-teal-600" />
          <h3 className="font-semibold text-foreground">
            {isAr ? 'ماذا تحتاج؟' : 'What do you need?'}
          </h3>
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={isAr ? 'مثال: تركيب رف كتب IKEA' : 'e.g., Assemble IKEA bookshelf'}
          className="input-field-flow"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          {isAr ? 'تفاصيل إضافية (اختياري)' : 'Additional details (optional)'}
        </label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={
            isAr
              ? 'صف المهمة بتفصيل أكثر. أضف أي متطلبات أو مواد...'
              : 'Describe the task in more detail. Include any specific requirements or materials needed...'
          }
          rows={3}
          className="input-field-flow resize-none"
        />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <ImagePlus className="w-5 h-5 text-teal-600" />
          <h3 className="font-semibold text-foreground">
            {isAr ? 'إضافة صور أو فيديو (اختياري)' : 'Add photos or videos (optional)'}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          {isAr ? 'الصور والفيديو تساعد المهمات على فهم المهمة بشكل أفضل' : 'Photos and videos help Taskers understand your task better'}
        </p>

        <div className="flex flex-wrap gap-3">
          {images.map((file, index) => (
            <div
              key={index}
              className="relative w-20 h-20 rounded-xl overflow-hidden border border-border bg-muted/50 flex items-center justify-center"
            >
              {isVideoFile(file) ? (
                <>
                  <video
                    src={URL.createObjectURL(file)}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Video className="w-8 h-8 text-white drop-shadow" />
                  </div>
                </>
              ) : (
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => removeMedia(index)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          {images.length < 5 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-teal-500 hover:bg-accent/50 transition-colors flex items-center justify-center"
            >
              <ImagePlus className="w-6 h-6 text-muted-foreground" />
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleMediaUpload}
          className="hidden"
        />
      </div>
    </motion.div>
  );
};

export default TaskDetailsForm;
