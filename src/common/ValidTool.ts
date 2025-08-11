/**
 * Validate if name field meets specifications
 * @param fieldValue Content to validate
 * @returns Whether it meets specifications, returns true if compliant, false otherwise
 */
export const validateNameField = (fieldValue) => {
	const pattern = /^(?![\s-_])(?!.*[\s-_]{2})[a-zA-Z0-9-\uAC00-\uD7AF\u3040-\u30FF\u4E00-\u9FAF\u00C0-\u1EF9_\s]+(?<![\s-_])$/
  const trimmedValue = fieldValue.trim()
  if (
    trimmedValue.length === 0 ||
    trimmedValue.length > 20 ||
    fieldValue !== trimmedValue ||
    trimmedValue.includes("  ") ||
    pattern.test(trimmedValue)
  ) {
		return true
  }
	return false
}
