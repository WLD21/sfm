// Public configuration only. Never add private API keys or payment secrets.
export const siteConfig = {
  name: 'Supreme Fitness & Massage',
  sitesProjectId: 'appgprj_6ad270cdc964819194480bb559a38ade',
  designReferenceLibraryId: 'libfile_ddc389c459b48191ae1f741adf7b3204',
  designSource: 'Recovered approved standalone HTML, version 5, and uploaded conversation record',
  contactUrl: 'https://supremefitnessmassage.com/home',
  // Verified business recipient for review email handoffs. Empty disables sending.
  reviews: { recipientEmail: '' },
  photos: [
    { src: '/images/supreme-treatment.jpg', alt: 'Supreme Fitness & Massage treatment photograph and original brand artwork', caption: 'Care that feels personal' },
    { src: '/images/massage-session.jpg', alt: 'A Supreme massage session with a purple blanket and white towel', caption: 'Time to unwind' },
    { src: '/images/personal-care.jpg', alt: 'Personal massage care provided by the Supreme therapist', caption: 'Your moment of care' },
    { src: '/images/training-certificate.jpg', alt: 'Certificate recording 30 hours of massage instruction, dated 27 September 2025', caption: 'Massage training certificate — 30 hours of instruction' },
    { src: '/images/supreme-poster.jpg', alt: 'Original black and gold Supreme poster with serif lettering and lotus artwork', caption: 'The Supreme identity' },
    { src: '/images/treatment-menu.jpg', alt: 'Original Supreme treatment menu with six services and euro prices', caption: 'The original treatment menu' },
  ],
  // Populate only after plan prices, interval, entitlements and terms are approved.
  // Entries: { id, name, priceMinor, currency: 'EUR', interval: 'month', checkoutUrl }.
  // A valid URL enables a provider handoff; it does not prove payment or activation.
  subscriptions: [],
};
