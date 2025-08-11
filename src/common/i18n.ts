import EmailTemplate from "./EmailTemplate.js";

// Language files
import English from "../locales/English.js"; // English
import ChineseSimplified from "../locales/Chinese Simplified.js"; // Simplified Chinese
import French from "../locales/French.js"; // French
import Japanese from "../locales/Japanese.js"; // Japanese
import Cantonese from "../locales/Cantonese.js"; // Cantonese
import Indonesian from "../locales/Indonesian.js"; // Indonesian
import Korean from "../locales/Korean.js"; // Korean
import ChineseTraditional from "../locales/Chinese Traditional.js"; // Traditional Chinese
import Vietnamese from "../locales/Vietnamese.js"; // Vietnamese


const languagePacks = {
	"zh-Hans-CN": ChineseSimplified,
	"zht": ChineseTraditional,
	"en": English,
	"fr": French,
	"ja": Japanese,
	"yue": Cantonese,
	"id": Indonesian,
	"ko": Korean,
	"vi": Vietnamese,
};

/**
 * Determine the client's language and return the corresponding language pack
 * @param clientLanguage Client's language
 * @param targetMail Target email
 * @returns Corresponding language pack content or null
 */
export const getI18nLanguagePack = (clientLanguage: string, targetMail: string) => {
	const languagePack = languagePacks[clientLanguage as keyof typeof languagePacks] ?? English;
	let messages = languagePack[targetMail as keyof typeof languagePack] as Record<string, string>;
	if (!messages) {
		messages = English[targetMail as keyof typeof English] as Record<string, string>;
		if (!messages) return null;
	}
	const { mailTitle } = messages;
	let mailHtml = EmailTemplate;
	Object.entries(messages).forEach(([key, value]) => mailHtml = mailHtml.replaceAll(`{{${key}}}`, value.replaceAll("\n", "<br>")));
	return { mailTitle, mailHtml };
};
