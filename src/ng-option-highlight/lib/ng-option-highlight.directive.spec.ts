import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { NgOptionHighlightDirective } from './ng-option-highlight.directive';

@Component({
	template: `
		<span id="test1" [ngOptionHighlight]="term">My text is highlighted</span>
		<span id="test2" [ngOptionHighlight]="term">My text is not highlighted</span>
		<span id="test3" [ngOptionHighlight]="term">Multiple text is highlighted</span>
		<span id="test4" [ngOptionHighlight]="term">My ťëxť is highlighted text</span>
		@if (showNew) {
			<span id="test5" [ngOptionHighlight]="term">New label</span>
		}
		<span id="test6" [ngOptionHighlight]="term">+My text is) high\\lighted</span>
	`,
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [NgOptionHighlightDirective],
})
class TestComponent {
	term: string;
	showNew = false;
}

/**
 * Zone/zoneless parity shim (same as ng-select's testing/helpers.ts): in a zoneless
 * TestBed, fixture.detectChanges() only renders views Angular knows are dirty, so plain
 * test-property mutations would be skipped by the render pass and then flagged NG0100 by
 * the checkNoChanges pass (angular/angular#59082). Marking the root view dirty first
 * restores identical semantics in both lanes.
 */
function applyZonelessFixtureCompat<T>(fixture: ComponentFixture<T>): ComponentFixture<T> {
	const originalDetectChanges = fixture.detectChanges.bind(fixture);
	fixture.detectChanges = (checkNoChanges?: boolean) => {
		fixture.changeDetectorRef.markForCheck();
		originalDetectChanges(checkNoChanges);
	};
	return fixture;
}

describe('NgOptionHighlightDirective', () => {
	let fixture: ComponentFixture<TestComponent>;

	beforeEach(() => {
		fixture = applyZonelessFixtureCompat(
			TestBed.configureTestingModule({
				imports: [TestComponent],
			}).createComponent(TestComponent),
		);

		fixture.detectChanges();
	});

	it('should have five elements with highlight directive', () => {
		const highlightDirectives = fixture.debugElement.queryAll(By.directive(NgOptionHighlightDirective));
		expect(highlightDirectives.length).toBe(5);
	});

	it('should have one element with highlighted text when term matching', () => {
		const span = fixture.debugElement.query(By.css('#test1'));
		fixture.componentInstance.term = 'is high';
		fixture.detectChanges();
		expect(span.nativeElement.querySelectorAll('.highlighted')[0].innerHTML).toBe('is');
		expect(span.nativeElement.querySelectorAll('.highlighted')[1].innerHTML).toBe('high');
		expect(span.nativeElement.textContent).toBe('My text is highlighted');
	});

	it('should have one element with no highlighted text when term not matching', () => {
		const span = fixture.debugElement.query(By.css('#test2'));
		fixture.componentInstance.term = 'non matching';
		fixture.detectChanges();
		expect(span.nativeElement.querySelector('.highlighted')).toBeNull();
		expect(span.nativeElement.innerHTML).toBe('My text is not highlighted');
	});

	it('should have multiple elements with highlighted text when term matching', () => {
		const span = fixture.debugElement.query(By.css('#test3'));
		fixture.componentInstance.term = 'Multiple text highlighted';
		fixture.detectChanges();
		expect(span.nativeElement.querySelectorAll('.highlighted')[0].innerHTML).toBe('Multiple');
		expect(span.nativeElement.querySelectorAll('.highlighted')[1].innerHTML).toBe('text');
		expect(span.nativeElement.querySelectorAll('.highlighted')[2].innerHTML).toBe('highlighted');
		expect(span.nativeElement.textContent).toBe('Multiple text is highlighted');
	});

	it('Highlights special characters', () => {
		const span = fixture.debugElement.query(By.css('#test4'));
		fixture.componentInstance.term = 'ťëxť';
		fixture.detectChanges();
		expect(span.nativeElement.querySelector('.highlighted').innerHTML).toBe('ťëxť');
		expect(span.nativeElement.textContent).toBe('My ťëxť is highlighted text');
	});

	it('should highlight text when label changed', async () => {
		fixture.componentInstance.term = 'new';
		fixture.detectChanges();
		fixture.componentInstance.showNew = true;
		fixture.detectChanges();
		await fixture.whenRenderingDone();
		const span = fixture.debugElement.query(By.css('#test5'));
		expect(span.nativeElement.querySelector('.highlighted').innerHTML).toBe('New');
		expect(span.nativeElement.textContent).toBe('New label');
	});

	it('should highlight text with a special character at the beginning of the term', () => {
		const span = fixture.debugElement.query(By.css('#test6'));

		fixture.componentInstance.term = '+My text';
		fixture.detectChanges();
		expect(span.nativeElement.querySelectorAll('.highlighted')[0].innerHTML).toBe('+My');
		expect(span.nativeElement.querySelectorAll('.highlighted')[1].innerHTML).toBe('text');
		expect(span.nativeElement.textContent).toBe('+My text is) high\\lighted');
	});

	it('should highlight text with a special character at the end of the term', () => {
		const span = fixture.debugElement.query(By.css('#test6'));

		fixture.componentInstance.term = 'is)';
		fixture.detectChanges();
		expect(span.nativeElement.querySelectorAll('.highlighted')[0].innerHTML).toBe('is)');
		expect(span.nativeElement.textContent).toBe('+My text is) high\\lighted');
	});

	it('should highlight text with a special character in the middle of the term', () => {
		const span = fixture.debugElement.query(By.css('#test6'));

		fixture.componentInstance.term = 'high\\l';
		fixture.detectChanges();
		expect(span.nativeElement.querySelectorAll('.highlighted')[0].innerHTML).toBe('high\\l');
		expect(span.nativeElement.textContent).toBe('+My text is) high\\lighted');
	});
});

@Component({
	template: `
		@for (item of items; track $index) {
			<span class="row" [ngOptionHighlight]="term">{{ item }}</span>
		}
		<span id="bound" [ngOptionHighlight]="term">{{ label }}</span>
		<div id="container-host">
			<ng-container [ngOptionHighlight]="term">{{ label }}</ng-container>
		</div>
		<span id="nested" [ngOptionHighlight]="term"
			><b>{{ label }}</b> &amp; more
			@if (showExtra) {
				<i>extra {{ label }}</i>
			}
		</span>
	`,
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [NgOptionHighlightDirective],
})
class DynamicTestComponent {
	items = ['Apple', 'Banana', 'Cherry'];
	term = '';
	label = 'First label';
	showExtra = false;
}

describe('NgOptionHighlightDirective with changing content', () => {
	let fixture: ComponentFixture<DynamicTestComponent>;

	// Lets pending render hooks and MutationObserver callbacks run.
	async function settle() {
		fixture.detectChanges();
		await fixture.whenStable();
		await new Promise((resolve) => setTimeout(resolve));
	}

	beforeEach(async () => {
		fixture = applyZonelessFixtureCompat(
			TestBed.configureTestingModule({
				imports: [DynamicTestComponent],
			}).createComponent(DynamicTestComponent),
		);
		await settle();
	});

	it('should show the current label when an index-tracked row is reused for another item', async () => {
		fixture.componentInstance.items = ['Cherry'];
		fixture.componentInstance.term = 'ch';
		await settle();
		const rows = fixture.nativeElement.querySelectorAll('.row');
		expect(rows.length).toBe(1);
		expect(rows[0].textContent).toBe('Cherry');
		expect(rows[0].innerHTML).toBe('<span class="highlighted">Ch</span>erry');
	});

	it('should show reused rows without highlight when the term is cleared', async () => {
		fixture.componentInstance.term = 'an';
		await settle();
		fixture.componentInstance.items = ['Date', 'Elderberry'];
		fixture.componentInstance.term = '';
		await settle();
		const rows = fixture.nativeElement.querySelectorAll('.row');
		expect(rows[0].innerHTML).toBe('Date');
		expect(rows[1].innerHTML).toBe('Elderberry');
	});

	it('should reflect bound label changes after the first highlight', async () => {
		const span = fixture.nativeElement.querySelector('#bound');
		fixture.componentInstance.term = 'label';
		await settle();
		expect(span.innerHTML).toBe('First <span class="highlighted">label</span>');

		fixture.componentInstance.label = 'Second label';
		await settle();
		expect(span.innerHTML).toBe('Second <span class="highlighted">label</span>');
	});

	it('should highlight nested markup and content added by control flow', async () => {
		const span = fixture.nativeElement.querySelector('#nested');
		fixture.componentInstance.term = 'label';
		await settle();
		expect(span.querySelector('b').innerHTML).toBe('First <span class="highlighted">label</span>');

		fixture.componentInstance.showExtra = true;
		fixture.componentInstance.label = 'Next label';
		await settle();
		expect(span.querySelector('b').innerHTML).toBe('Next <span class="highlighted">label</span>');
		expect(span.querySelector('i').innerHTML).toBe('extra Next <span class="highlighted">label</span>');

		fixture.componentInstance.showExtra = false;
		await settle();
		expect(span.querySelector('i')).toBeNull();
	});

	it('should not match markup or entities', async () => {
		const span = fixture.nativeElement.querySelector('#nested');
		fixture.componentInstance.term = 'amp';
		await settle();
		expect(span.querySelector('b')).not.toBeNull();
		expect(span.querySelectorAll('.highlighted').length).toBe(0);
		expect(span.textContent.replace(/\s+/g, ' ').trim()).toBe('First label & more');
	});

	it('should highlight terms with leading and trailing whitespace', async () => {
		const span = fixture.nativeElement.querySelector('#bound');
		fixture.componentInstance.term = ' first  label ';
		await settle();
		expect(span.innerHTML).toBe('<span class="highlighted">First</span> <span class="highlighted">label</span>');

		fixture.componentInstance.term = '   ';
		await settle();
		expect(span.innerHTML).toBe('First label');
	});

	it('should leave an ng-container host untouched', async () => {
		const host = fixture.nativeElement.querySelector('#container-host');
		fixture.componentInstance.term = 'label';
		await settle();
		fixture.componentInstance.label = 'Other label';
		await settle();
		expect(host.textContent).toBe('Other label');
		expect(host.querySelector('.highlighted')).toBeNull();
	});
});
