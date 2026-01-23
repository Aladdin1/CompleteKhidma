import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { reviewAPI } from '../services/api';
import '../styles/ReviewForm.css';

const REVIEW_TAGS = [
  'punctual',      // دقيق في المواعيد
  'professional',  // محترف
  'clean_work',    // عمل نظيف
  'friendly',      // ودود
  'efficient',     // فعال
  'skilled',       // ماهر
  'communicative', // تواصلي جيد
  'reliable'       // موثوق
];

const REVIEW_TAGS_AR = {
  punctual: 'دقيق في المواعيد',
  professional: 'محترف',
  clean_work: 'عمل نظيف',
  friendly: 'ودود',
  efficient: 'فعال',
  skilled: 'ماهر',
  communicative: 'تواصلي جيد',
  reliable: 'موثوق'
};

const REVIEW_TAGS_EN = {
  punctual: 'Punctual',
  professional: 'Professional',
  clean_work: 'Clean Work',
  friendly: 'Friendly',
  efficient: 'Efficient',
  skilled: 'Skilled',
  communicative: 'Good Communication',
  reliable: 'Reliable'
};

function ReviewForm({ bookingId, revieweeName, onSuccess, onCancel }) {
  const { t, i18n } = useTranslation();
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isArabic = i18n.language === 'ar';

  const handleTagToggle = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError(isArabic ? 'يرجى اختيار تقييم' : 'Please select a rating');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      await reviewAPI.create(bookingId, {
        rating,
        tags: selectedTags,
        comment: comment.trim() || undefined
      });

      onSuccess?.();
    } catch (err) {
      if (err.response?.data?.error?.code === 'REVIEW_EXISTS') {
        setError(isArabic ? 'تم التقييم مسبقاً' : 'Review already submitted');
      } else {
        setError(err.response?.data?.error?.message || (isArabic ? 'فشل إرسال التقييم' : 'Failed to submit review'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const tagLabels = isArabic ? REVIEW_TAGS_AR : REVIEW_TAGS_EN;

  return (
    <div className="review-form-container">
      <h3>{t('task.review')}</h3>
      <p className="review-form-subtitle">
        {isArabic 
          ? `قيم ${revieweeName || 'المستخدم'}`
          : `Rate ${revieweeName || 'the user'}`
        }
      </p>

      <form onSubmit={handleSubmit} className="review-form">
        {/* Rating Stars */}
        <div className="rating-section">
          <label className="rating-label">{t('task.yourRating')}</label>
          <div className="star-rating">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                className={`star-btn ${rating >= star ? 'active' : ''}`}
                onClick={() => setRating(star)}
                disabled={submitting}
              >
                ⭐
              </button>
            ))}
          </div>
          {rating > 0 && (
            <span className="rating-value">{rating}/5</span>
          )}
        </div>

        {/* Tags */}
        <div className="tags-section">
          <label className="tags-label">{t('task.reviewTags')}</label>
          <div className="tags-grid">
            {REVIEW_TAGS.map(tag => (
              <button
                key={tag}
                type="button"
                className={`tag-btn ${selectedTags.includes(tag) ? 'selected' : ''}`}
                onClick={() => handleTagToggle(tag)}
                disabled={submitting}
              >
                {tagLabels[tag]}
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div className="comment-section">
          <label htmlFor="review-comment" className="comment-label">
            {t('task.comment')} <span className="optional">({t('task.optional')})</span>
          </label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={isArabic ? 'اكتب تعليقك هنا...' : 'Write your comment here...'}
            rows="4"
            className="comment-textarea"
            disabled={submitting}
          />
        </div>

        {error && <div className="review-error">{error}</div>}

        <div className="review-form-actions">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="cancel-btn"
              disabled={submitting}
            >
              {t('task.cancel')}
            </button>
          )}
          <button
            type="submit"
            className="submit-btn"
            disabled={submitting || rating === 0}
          >
            {submitting 
              ? (isArabic ? 'جاري الإرسال...' : 'Submitting...')
              : t('task.submitReview')
            }
          </button>
        </div>
      </form>
    </div>
  );
}

export default ReviewForm;
