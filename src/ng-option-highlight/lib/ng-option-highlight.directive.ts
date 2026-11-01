import { afterNextRender, effect, inject, input, Directive, DestroyRef, ElementRef } from '@angular/core';
import { escapeRegExp } from './utils';

/** Highlights the search term in an option's text. Accepts the search term; should be used on the option element. */
@Directive({
	selector: '[ngOptionHighlight]',
	standalone: true,
})
export class NgOptionHighlightDirective {
	// Dependencies
	private readonly element: HTMLElement = inject(ElementRef<HTMLElement>).nativeElement;

	// Detached holder of the Angular-managed child nodes; Angular keeps updating them there
	private source: HTMLElement | null = null;
	private observer: MutationObserver | null = null;

	// Inputs
	public readonly term = input<string>('', { alias: 'ngOptionHighlight' });

	// Re-render on term change once the source is captured
	_effectUpdateHighlight = effect(() => {
		const term = this.term();
		if (this.source) {
			this._render(term);
		}
	});

	_ = afterNextRender(() => {
		// Non-element hosts (e.g. ng-container) are left untouched
		if (this.element.nodeType !== Node.ELEMENT_NODE) {
			return;
		}
		const doc = this.element.ownerDocument;
		this.source = doc.createElement('div');
		this.source.append(...Array.from(this.element.childNodes));
		this.observer = new MutationObserver(() => this._render(this.term()));
		this.observer.observe(this.source, { childList: true, characterData: true, attributes: true, subtree: true });
		// 1st label highlight triggers from here
		this._render(this.term());
	});

	constructor() {
		inject(DestroyRef).onDestroy(() => this.observer?.disconnect());
	}

	private _render(term: string) {
		// Drop pending records so a combined term and content change renders once
		this.observer?.takeRecords();
		const doc = this.element.ownerDocument;
		const fragment = doc.createDocumentFragment();
		this.source.childNodes.forEach((node) => fragment.appendChild(node.cloneNode(true)));
		const alternation = (term ?? '').trim().split(/\s+/).filter(Boolean).map(escapeRegExp).join('|');
		if (alternation) {
			const regex = new RegExp(alternation, 'gi');
			const walker = doc.createTreeWalker(fragment, NodeFilter.SHOW_TEXT);
			const textNodes: Text[] = [];
			while (walker.nextNode()) {
				textNodes.push(walker.currentNode as Text);
			}
			textNodes.forEach((textNode) => this._highlightText(textNode, regex));
		}
		this.element.replaceChildren(fragment);
	}

	// Wraps matches of a text node in highlight spans
	private _highlightText(textNode: Text, regex: RegExp) {
		const text = textNode.data;
		const doc = textNode.ownerDocument;
		const parts: Node[] = [];
		let lastIndex = 0;
		for (const match of text.matchAll(regex)) {
			if (match.index > lastIndex) {
				parts.push(doc.createTextNode(text.slice(lastIndex, match.index)));
			}
			const span = doc.createElement('span');
			span.className = 'highlighted';
			span.textContent = match[0];
			parts.push(span);
			lastIndex = match.index + match[0].length;
		}
		if (!parts.length) {
			return;
		}
		if (lastIndex < text.length) {
			parts.push(doc.createTextNode(text.slice(lastIndex)));
		}
		textNode.replaceWith(...parts);
	}
}
