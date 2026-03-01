const unescapedHTMLExp = /[&<>"']/g;
const hasUnescapedHTMLExp = RegExp(unescapedHTMLExp.source);
const htmlTagExp = /<[^>]*>/g;
const htmlEscapes = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;',
};

export function escapeHTML(value: string) {
	return value && hasUnescapedHTMLExp.test(value) ? value.replace(unescapedHTMLExp, (chr) => htmlEscapes[chr]) : value;
}

export function stripHtml(value: string) {
	return value ? value.replace(htmlTagExp, ' ').replace(/\s+/g, ' ').trim() : value;
}

export function isDefined(value: any) {
	return value !== undefined && value !== null;
}

export function isObject(value: any) {
	return typeof value === 'object' && isDefined(value);
}

export function isPromise(value: any) {
	return value instanceof Promise;
}

export function isFunction(value: any) {
	return value instanceof Function;
}
