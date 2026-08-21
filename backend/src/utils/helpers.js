// Utility Helper Functions

// Generate a URL-safe slug from a string (e.g. project name)
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
};

// Generate property unique system code: PROP-[BRANCH_CODE]-[RANDOM_4]
const generatePropertyCode = (branchCode) => {
  const cleanCode = branchCode.replace(/\s+/g, '').toUpperCase();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `PROP-${cleanCode}-${randomSuffix}`;
};

module.exports = {
  slugify,
  generatePropertyCode
};
