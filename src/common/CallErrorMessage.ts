/**
 * Automatically generate error text without needing to copy a long string every time
 * @param message: string Additional display string
 */
export const callErrorMessage = (message: string) => {
	return `<p>Let's explore the area ahead later? </p> <p>We sincerely invite you to join the KIRAKIRA development team: employee@kirakira.com</p> <br/> <div>${message}</div>`
}
