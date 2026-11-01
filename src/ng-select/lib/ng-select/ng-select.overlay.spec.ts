import { ErrorHandler } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import type { Mock } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import {
	applyZonelessFixtureCompat,
	getNgSelectElement,
	getNgSelectNativeElement,
	selectOption,
	TestsErrorHandler,
	tickAndDetectChanges,
	triggerKeyDownEvent,
} from '../../testing/helpers';
import { MockConsole } from '../../testing/mocks';
import { openSelect } from '../../testing/timer-helpers';
import { NgOptionComponent } from '../ng-option.component';
import { provideNgSelect } from '../ng-select.module';
import { NgSelectConfig } from '../services/config.service';
import { ConsoleService } from '../services/console.service';
import { KeyCode, NgOption } from '../types/ng-select.types';
import { NgSelectComponent } from './ng-select.component';

import { createEvent, createTestingModule, EncapsulatedTestComponent, NgSelectTestComponent } from '../../testing/ng-select-test-fixtures';

describe('NgSelectComponent', () => {
	describe('Dropdown panel', () => {
		it('should set and render items in dropdown panel', async () => {
			const fixture = createTestingModule(
				NgSelectTestComponent,
				`<ng-select [items]="cities"
                            bindLabel="name"
                            [(ngModel)]="city">
                </ng-select>`,
			);

			const select = fixture.componentInstance.select();
			await openSelect(select, fixture);

			expect(select.dropdownPanel().items().length).toBe(5);
			let options = document.querySelectorAll<HTMLElement>('.ng-option');
			expect(options.length).toBe(5);
			expect(options[0].innerText).toBe('New York');
			expect(options[1].innerText).toBe('London');
			expect(options[2].innerText).toBe('Beijing');

			fixture.componentInstance.cities = Array.from(Array(30).keys()).map((_, i) => ({
				id: i,
				name: String.fromCharCode(97 + i),
			}));
			await tickAndDetectChanges(fixture);
			options = document.querySelectorAll<HTMLElement>('.ng-option');
			expect(options.length).toBe(30);
			expect(options[0].innerText).toBe('a');
		});

		it('should always have div #padding with height 0 in dropdown panel when virtual scroll is disabled', async () => {
			const fixture = createTestingModule(
				NgSelectTestComponent,
				`<ng-select [items]="cities"
                            bindLabel="name"
                            [virtualScroll]="false">
                </ng-select>`,
			);

			const select = fixture.componentInstance.select();
			await openSelect(select, fixture);

			const panelItems = document.querySelector('.ng-dropdown-panel-items');
			const firstChild = <HTMLScriptElement>panelItems.firstChild;

			expect(firstChild.offsetHeight).toBe(0);
		});

		it('should have div #padding with height other than 0 in dropdown panel when virtual scroll is enabled', async () => {
			const fixture = createTestingModule(
				NgSelectTestComponent,
				`<ng-select [items]="cities"
                            bindLabel="name"
                            [virtualScroll]="true">
                </ng-select>`,
			);

			const select = fixture.componentInstance.select();
			await openSelect(select, fixture);

			expect(fixture.componentInstance.select().dropdownPanel().items().length).toBe(5);
			const options = document.querySelectorAll<HTMLElement>('.ng-option');
			expect(options.length).toBe(5);
			expect(options[0].innerText).toBe('New York');
			expect(options[1].innerText).toBe('London');
			expect(options[2].innerText).toBe('Beijing');

			fixture.componentInstance.cities = Array.from(Array(30).keys()).map((_, i) => ({
				id: i,
				name: String.fromCharCode(97 + i),
			}));
			await tickAndDetectChanges(fixture);

			const panelItems = document.querySelector('.ng-dropdown-panel-items');
			const firstChild = <HTMLScriptElement>panelItems.firstChild;

			expect(firstChild.offsetHeight).not.toBe(0);
		});

		it('should set and render items in dropdown panel with virtual scroll', async () => {
			const fixture = createTestingModule(
				NgSelectTestComponent,
				`<ng-select [items]="cities"
                            bindLabel="name"
                            [virtualScroll]="true"
                            [(ngModel)]="city">
                </ng-select>`,
			);

			const select = fixture.componentInstance.select();
			await openSelect(select, fixture);

			expect(fixture.componentInstance.select().dropdownPanel().items().length).toBe(5);
			let options = document.querySelectorAll<HTMLElement>('.ng-option');
			expect(options.length).toBe(5);
			expect(options[0].innerText).toBe('New York');
			expect(options[1].innerText).toBe('London');
			expect(options[2].innerText).toBe('Beijing');

			fixture.componentInstance.cities = Array.from(Array(30).keys()).map((_, i) => ({
				id: i,
				name: String.fromCharCode(97 + i),
			}));
			await tickAndDetectChanges(fixture);
			options = document.querySelectorAll<HTMLElement>('.ng-option');
			const { itemsPerViewport } = (select.dropdownPanel() as any)._panelService.dimensions;
			const expectedItemsLength = Math.min(fixture.componentInstance.cities.length, itemsPerViewport + 1 + select.bufferAmount());
			expect(options.length).toBe(expectedItemsLength);
			expect(options[0].innerText).toBe('a');
		});

		it('should open empty dropdown panel with virtual scroll', async () => {
			const fixture = createTestingModule(
				NgSelectTestComponent,
				`<ng-select [items]="[]"
                            bindLabel="name"
                            [virtualScroll]="true"
                            appendTo="body"
                            [(ngModel)]="city">
                </ng-select>`,
			);

			const select = fixture.componentInstance.select();
			await openSelect(select, fixture);

			const options = document.querySelectorAll<HTMLElement>('.ng-option');
			expect(options.length).toBe(1);
			expect((<HTMLElement>options[0]).innerText).toBe('No items found');
		});

		it('should scroll to selected item on first open when virtual scroll is enabled', async () => {
			const fixture = createTestingModule(
				NgSelectTestComponent,
				`<ng-select [items]="cities"
                            bindLabel="name"
                            [virtualScroll]="true"
                            [appendTo]="body"
                            [(ngModel)]="city">
                </ng-select>`,
			);

			const select = fixture.componentInstance.select();
			const cmp = fixture.componentInstance;
			cmp.cities = Array.from(Array(30).keys()).map((_, i) => ({ id: i, name: String.fromCharCode(97 + i) }));
			cmp.city = cmp.cities[10];
			await tickAndDetectChanges(fixture);

			await openSelect(select, fixture);

			const options = document.querySelectorAll<HTMLElement>('.ng-option');
			const marked = document.querySelector<HTMLElement>('.ng-option-marked');

			// Accept both 17 and 18 options as valid (environment-dependent panel height causes this variation)
			// With 240px panel height: itemsPerViewport=12, buffer=4, renders 18 options
			// With 220px panel height: itemsPerViewport=11, buffer=4, renders 17 options
			expect(options.length).toBeGreaterThanOrEqual(17);
			expect(options.length).toBeLessThanOrEqual(19);
			expect(marked.innerText).toBe('k');
			expect(marked.offsetTop).toBeGreaterThanOrEqual(180);
		});

		it('should scroll to item and do not change scroll position when scrolled to visible item', async () => {
			const fixture = createTestingModule(
				NgSelectTestComponent,
				`<ng-select [items]="cities"
                            bindLabel="name"
                            [(ngModel)]="city">
                </ng-select>`,
			);
			const cmp = fixture.componentInstance;

			cmp.select().open();
			await tickAndDetectChanges(fixture);

			cmp.cities = Array.from(Array(30).keys()).map((_, i) => ({ id: i, name: String.fromCharCode(97 + i) }));
			await tickAndDetectChanges(fixture);

			cmp.select().dropdownPanel().scrollTo(cmp.select().itemsList.items[1]);
			await tickAndDetectChanges(fixture);

			const panelItems = document.querySelector('.ng-dropdown-panel-items');
			expect(panelItems.scrollTop).toBe(0);
		});

		it('should scroll to item and change scroll position when scrolled to not visible item', async () => {
			const fixture = createTestingModule(
				NgSelectTestComponent,
				`<ng-select [items]="cities"
                            bindLabel="name"
                            [(ngModel)]="city">
                </ng-select>`,
			);
			const cmp = fixture.componentInstance;

			cmp.cities = Array.from(Array(30).keys()).map((_, i) => ({ id: i, name: String.fromCharCode(97 + i) }));
			await openSelect(cmp.select(), fixture);

			cmp.select().dropdownPanel().scrollTo(cmp.select().itemsList.items[15]);
			await tickAndDetectChanges(fixture);

			const panelItems = document.querySelector('.ng-dropdown-panel-items');
			expect(panelItems.scrollTop).toBeGreaterThanOrEqual(48);
		});

		it('should close on option select by default', async () => {
			const fixture = createTestingModule(
				NgSelectTestComponent,
				`<ng-select [items]="cities"
                            bindLabel="name"
                            [(ngModel)]="city">
                </ng-select>`,
			);

			await selectOption(fixture, KeyCode.ArrowDown, 0);

			await tickAndDetectChanges(fixture);
			expect(fixture.componentInstance.select().isOpen()).toBeFalsy();
		});

		it('should select item with encapsulation = ShadowDom', async () => {
			const fixture = createTestingModule(
				EncapsulatedTestComponent,
				`<ng-select [items]="cities"
                            bindLabel="name"
                            [(ngModel)]="city"></ng-select>`,
			);

			expect((<NgOption[]>fixture.componentInstance.select().selectedItems).length).toBe(0);
			expect(fixture.componentInstance.select().isOpen()).toBeFalsy();

			const cmp = fixture.componentInstance;

			cmp.select().open();
			await tickAndDetectChanges(fixture);

			expect((<NgOption[]>fixture.componentInstance.select().selectedItems).length).toBe(0);
			expect(fixture.componentInstance.select().isOpen()).toBeTruthy();

			const outsideClick = vi.spyOn(cmp.select().dropdownPanel().outsideClick, 'emit').mockReturnValue(undefined);
			expect(outsideClick).not.toHaveBeenCalled();

			const listItem = fixture.debugElement.query(By.css('.ng-option'));
			let event = new MouseEvent('mousedown', { bubbles: true });
			listItem.nativeElement.dispatchEvent(event);
			event = new MouseEvent('click', { bubbles: true });
			listItem.nativeElement.dispatchEvent(event);
			await tickAndDetectChanges(fixture);

			await tickAndDetectChanges(fixture);
			expect(outsideClick).not.toHaveBeenCalled();
			expect(fixture.componentInstance.select().isOpen()).toBeFalsy();
			expect((<NgOption[]>fixture.componentInstance.select().selectedItems).length).toBe(1);
		});

		it('should open and close normally when [isOpen] is bound to undefined', async () => {
			const fixture = createTestingModule(
				NgSelectTestComponent,
				`<ng-select [items]="cities"
                            [isOpen]="undefined"
                            bindLabel="name"
                            [(ngModel)]="city">
                </ng-select>`,
			);

			const select = fixture.componentInstance.select();
			select.open();
			await tickAndDetectChanges(fixture);
			expect(select.isOpen()).toBe(true);
			select.close();
			await tickAndDetectChanges(fixture);
			expect(select.isOpen()).toBe(false);
		});

		it('should not close when isOpen is true', async () => {
			const fixture = createTestingModule(
				NgSelectTestComponent,
				`<ng-select [items]="cities"
                            [isOpen]="true"
                            bindLabel="name"
                            [(ngModel)]="city">
                </ng-select>`,
			);

			await selectOption(fixture, KeyCode.ArrowDown, 0);

			await tickAndDetectChanges(fixture);
			expect(fixture.componentInstance.select().isOpen()).toBeTruthy();
		});

		it('should not close on option select when [closeOnSelect]="false"', async () => {
			const fixture = createTestingModule(
				NgSelectTestComponent,
				`<ng-select [items]="cities"
                            bindLabel="name"
                            [closeOnSelect]="false"
                            [(ngModel)]="city">
                </ng-select>`,
			);

			await selectOption(fixture, KeyCode.ArrowDown, 0);
			await tickAndDetectChanges(fixture);

			expect(fixture.componentInstance.select().isOpen()).toBeTruthy();
		});

		it('should remove appended dropdown when it is destroyed', async () => {
			const fixture = createTestingModule(
				NgSelectTestComponent,
				`
                <ng-select [items]="cities"
                        appendTo="body"
                        [(ngModel)]="city">
                </ng-select>`,
			);

			fixture.componentInstance.select().open();
			fixture.detectChanges();
			fixture.componentInstance.select().close();

			await tickAndDetectChanges(fixture);
			const dropdown = <HTMLElement>document.querySelector('.ng-dropdown-panel');
			expect(dropdown).toBeNull();
		});

		it('should set aria-label on the inner listbox element when ariaLabelDropdown input is provided', async () => {
			const fixture = createTestingModule(NgSelectTestComponent, `<ng-select [items]="cities" ariaLabelDropdown="Custom Aria Label" />`);

			const select = fixture.componentInstance.select();
			select.open();
			await tickAndDetectChanges(fixture);

			// The dropdown panel itself should NOT have aria-label directly
			const dropdownPanel = document.querySelector('.ng-dropdown-panel');
			expect(dropdownPanel.getAttribute('aria-label')).toBeNull();

			// The inner element with role="listbox" should have the aria-label
			const listboxElement = document.querySelector('.ng-dropdown-panel-items[role="listbox"]');
			expect(listboxElement.getAttribute('aria-label')).toBe('Custom Aria Label');
		});

		it('should use ariaLabelDropdown from NgSelectConfig when not provided in template', async () => {
			const config = new NgSelectConfig();
			config.ariaLabelDropdown = 'Global Aria Label';
			const fixture = createTestingModule(NgSelectTestComponent, `<ng-select [items]="cities" />`, config);

			const select = fixture.componentInstance.select();
			select.open();
			await tickAndDetectChanges(fixture);

			const listboxElement = document.querySelector('.ng-dropdown-panel-items[role="listbox"]');
			expect(listboxElement.getAttribute('aria-label')).toBe('Global Aria Label');
		});

		it('should override ariaLabelDropdown from NgSelectConfig when provided in template', async () => {
			const config = new NgSelectConfig();
			config.ariaLabelDropdown = 'Global Aria Label';
			const fixture = createTestingModule(NgSelectTestComponent, `<ng-select [items]="cities" ariaLabelDropdown="Template Aria Label" />`, config);

			const select = fixture.componentInstance.select();
			select.open();
			await tickAndDetectChanges(fixture);

			const listboxElement = document.querySelector('.ng-dropdown-panel-items[role="listbox"]');
			expect(listboxElement.getAttribute('aria-label')).toBe('Template Aria Label');
		});

		describe('Popover (deprecated)', () => {
			it('should have popover input with default value false', async () => {
				const fixture = createTestingModule(NgSelectTestComponent, `<ng-select [items]="cities" bindLabel="name"></ng-select>`);

				const select = fixture.componentInstance.select();
				expect(select.popover()).toBe(false);
			});

			it('should warn that popover is deprecated and has no effect', async () => {
				const warnSpy = vi.spyOn(MockConsole.prototype, 'warn');
				try {
					createTestingModule(NgSelectTestComponent, `<ng-select [items]="cities" bindLabel="name" [popover]="true"></ng-select>`);
					expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('`popover` is deprecated'));
				} finally {
					warnSpy.mockRestore();
				}
			});

			it('should not warn when popover is not set', async () => {
				const warnSpy = vi.spyOn(MockConsole.prototype, 'warn');
				try {
					createTestingModule(NgSelectTestComponent, `<ng-select [items]="cities" bindLabel="name"></ng-select>`);
					expect(warnSpy).not.toHaveBeenCalled();
				} finally {
					warnSpy.mockRestore();
				}
			});

			it('should render the dropdown panel in the CDK overlay regardless of popover value', async () => {
				const fixture = createTestingModule(NgSelectTestComponent, `<ng-select [items]="cities" bindLabel="name" [popover]="false"></ng-select>`);

				const select = fixture.componentInstance.select();
				await openSelect(select, fixture);

				const panelElement = document.querySelector('.ng-dropdown-panel');
				expect(panelElement).not.toBeNull();
				expect(panelElement.closest('.cdk-overlay-pane')).not.toBeNull();
			});

			it('should render the dropdown panel in the native popover top layer when the browser supports it', async () => {
				const fixture = createTestingModule(NgSelectTestComponent, `<ng-select [items]="cities" bindLabel="name"></ng-select>`);

				const select = fixture.componentInstance.select();
				await openSelect(select, fixture);

				const panelElement = document.querySelector('.ng-dropdown-panel');
				// CDK renders its overlays as native popovers whenever the Popover API exists,
				// which puts the dropdown in the top layer above all z-index stacking contexts
				if ('showPopover' in document.body) {
					expect(panelElement.closest(':popover-open')).not.toBeNull();
				} else {
					expect(panelElement.closest('.cdk-overlay-container')).not.toBeNull();
				}
			});

			describe('ResizeObserver repositioning', () => {
				let originalResizeObserver: any;
				let observerCallback: () => void;
				let disconnectSpy: Mock;

				beforeEach(() => {
					originalResizeObserver = (globalThis as any).ResizeObserver;
					disconnectSpy = vi.fn().mockName('disconnect');

					(globalThis as any).ResizeObserver = class {
						constructor(cb: () => void) {
							observerCallback = cb;
						}
						observe() {}
						disconnect = disconnectSpy;
					};
				});

				afterEach(() => {
					(globalThis as any).ResizeObserver = originalResizeObserver;
				});

				it('should sync overlay width and position when the select element resizes', async () => {
					const fixture = createTestingModule(
						NgSelectTestComponent,
						`<ng-select [items]="cities" bindLabel="name" [multiple]="true" [closeOnSelect]="false" [(ngModel)]="selectedCities"></ng-select>`,
					);
					await tickAndDetectChanges(fixture);

					const select = fixture.componentInstance.select();
					await openSelect(select, fixture);

					const overlayRef = select.dropdownPanel().overlayRef();
					const updateSizeSpy = vi.spyOn(overlayRef, 'updateSize');
					const updatePositionSpy = vi.spyOn(overlayRef, 'updatePosition');

					observerCallback();
					await tickAndDetectChanges(fixture);

					expect(updateSizeSpy).toHaveBeenCalled();
					expect(updatePositionSpy).toHaveBeenCalled();
				});

				it('should disconnect ResizeObserver when the dropdown closes', async () => {
					const fixture = createTestingModule(
						NgSelectTestComponent,
						`<ng-select [items]="cities" bindLabel="name" [multiple]="true" [closeOnSelect]="false" [(ngModel)]="selectedCities"></ng-select>`,
					);
					await tickAndDetectChanges(fixture);

					const select = fixture.componentInstance.select();
					select.open();
					await tickAndDetectChanges(fixture);

					select.close();
					await tickAndDetectChanges(fixture);

					expect(disconnectSpy).toHaveBeenCalled();
				});

				it('should disconnect ResizeObserver when component is destroyed', async () => {
					const fixture = createTestingModule(
						NgSelectTestComponent,
						`<ng-select [items]="cities" bindLabel="name" [multiple]="true" [closeOnSelect]="false" [(ngModel)]="selectedCities"></ng-select>`,
					);
					await tickAndDetectChanges(fixture);

					const select = fixture.componentInstance.select();
					select.open();
					await tickAndDetectChanges(fixture);

					fixture.destroy();

					expect(disconnectSpy).toHaveBeenCalled();
				});
			});
		});
	});

	describe('Outside click', () => {
		let fixture: ComponentFixture<NgSelectTestComponent>;
		let select: NgSelectComponent;
		beforeEach(() => {
			fixture = createTestingModule(
				NgSelectTestComponent,
				`<div id="outside">Outside</div><br />
                <ng-select id="select" [items]="cities"
                    bindLabel="name"
                    multiple="true"
                    [closeOnSelect]="false"
                    appendTo="body"
                    [(ngModel)]="selectedCity">
                </ng-select>`,
			);
			select = fixture.componentInstance.select();
		});

		it('should close dropdown if opened and clicked outside dropdown container', async () => {
			triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
			expect(fixture.componentInstance.select().isOpen()).toBeTruthy();
			document.getElementById('outside').click();
			const event = new MouseEvent('mousedown', { bubbles: true });
			document.getElementById('outside').dispatchEvent(event);
			await tickAndDetectChanges(fixture);
			expect(fixture.componentInstance.select().isOpen()).toBeFalsy();
		});

		it('should prevent dropdown close if clicked on select', async () => {
			triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
			expect(select.isOpen()).toBeTruthy();
			document.getElementById('select').click();
			const event = new MouseEvent('mousedown', { bubbles: true });
			document.getElementById('select').dispatchEvent(event);
			await tickAndDetectChanges(fixture);
			expect(select.isOpen()).toBeTruthy();
		});

		it('should stay open when the page shifts between mousedown on the select and the resulting click (#2773)', async () => {
			triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
			await tickAndDetectChanges(fixture);
			expect(select.isOpen()).toBeTruthy();

			// The press begins on the select, but focus-scroll moves the layout before
			// the click event fires, so its target resolves to an unrelated element
			document.getElementById('select').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
			document.getElementById('outside').click();

			await tickAndDetectChanges(fixture);
			expect(select.isOpen()).toBeTruthy();
		});

		it('should close when the interaction starts and ends outside the component', async () => {
			triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
			await tickAndDetectChanges(fixture);
			expect(select.isOpen()).toBeTruthy();

			const outsideEl = document.getElementById('outside');
			outsideEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
			outsideEl.click();

			await tickAndDetectChanges(fixture);
			expect(select.isOpen()).toBeFalsy();
		});

		it('should stay open when an option is clicked from within a shadow root (#2726)', async () => {
			triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
			await tickAndDetectChanges(fixture);
			expect(select.isOpen()).toBeTruthy();

			// Host the panel in a shadow root, as happens with an appendTo target inside
			// a web component. The document-level listener then sees only the shadow host
			// as event target and must trace the click via composedPath() to recognize it
			// as an inside click
			const host = document.createElement('div');
			document.body.appendChild(host);
			const shadowRoot = host.attachShadow({ mode: 'open' });
			shadowRoot.appendChild(document.querySelector('ng-dropdown-panel'));

			try {
				const option = shadowRoot.querySelector('.ng-option') as HTMLElement;
				option.click();

				await tickAndDetectChanges(fixture);
				expect(select.isOpen()).toBeTruthy();
				expect(select.selectedItems.length).toBe(1);
			} finally {
				host.remove();
			}
		});

		it('should close dropdown when clicking outside if NgSelectConfig is provided as a partial object without outsideClickEvent', async () => {
			// Simulate real-world usage: `{ provide: NgSelectConfig, useValue: { appendTo: 'body' } }`
			// where outsideClickEvent is undefined because the plain object lacks that property.
			TestBed.resetTestingModule();
			TestBed.configureTestingModule({
				providers: [
					{ provide: ErrorHandler, useClass: TestsErrorHandler },
					{ provide: ConsoleService, useFactory: () => new MockConsole() },
					{ provide: NgSelectConfig, useValue: { appendTo: 'body' } },
					...provideNgSelect(),
				],
			}).overrideComponent(NgSelectTestComponent, {
				set: {
					template: `<div id="outside2">Outside</div>
					<ng-select id="select2" [items]="cities" bindLabel="name" [(ngModel)]="selectedCity"></ng-select>`,
					imports: [NgSelectComponent, NgOptionComponent, FormsModule],
				},
			});
			TestBed.compileComponents();
			const partialFixture = applyZonelessFixtureCompat(TestBed.createComponent(NgSelectTestComponent));
			partialFixture.detectChanges();
			const partialSelect = partialFixture.componentInstance.select();

			triggerKeyDownEvent(getNgSelectElement(partialFixture), KeyCode.Space);
			await tickAndDetectChanges(partialFixture);
			expect(partialSelect.isOpen()).toBeTruthy();

			document.getElementById('outside2').click();
			await tickAndDetectChanges(partialFixture);
			expect(partialSelect.isOpen()).toBeFalsy();
		});
	});

	describe('Outside click without appendTo', () => {
		let fixture: ComponentFixture<NgSelectTestComponent>;
		let select: NgSelectComponent;
		beforeEach(() => {
			fixture = createTestingModule(
				NgSelectTestComponent,
				`<div id="outside">Outside</div><br />
                <ng-select id="select" [items]="cities"
                    bindLabel="name"
                    multiple="true"
                    [closeOnSelect]="false"
                    [(ngModel)]="selectedCity">
                </ng-select>`,
			);
			select = fixture.componentInstance.select();
		});

		it('should stay open when the page shifts between mousedown on the select and the resulting click', async () => {
			triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
			await tickAndDetectChanges(fixture);
			expect(select.isOpen()).toBeTruthy();

			document.getElementById('select').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
			document.getElementById('outside').click();

			await tickAndDetectChanges(fixture);
			expect(select.isOpen()).toBeTruthy();
		});

		it('should close when the interaction starts and ends outside the component', async () => {
			triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
			await tickAndDetectChanges(fixture);
			expect(select.isOpen()).toBeTruthy();

			const outsideEl = document.getElementById('outside');
			outsideEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
			outsideEl.click();

			await tickAndDetectChanges(fixture);
			expect(select.isOpen()).toBeFalsy();
		});
	});

	describe('Close on scroll', () => {
		const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

		async function scrollDocument(fixture: ComponentFixture<NgSelectTestComponent>): Promise<void> {
			// The close listener attaches one frame after open, so scroll like a user would: after the panel has settled
			await nextFrame();
			document.dispatchEvent(new Event('scroll'));
			await nextFrame();
			await tickAndDetectChanges(fixture);
		}

		it('should stay open on document scroll by default', async () => {
			const fixture = createTestingModule(NgSelectTestComponent, `<ng-select [items]="cities" bindLabel="name" [(ngModel)]="selectedCity"></ng-select>`);
			const select = fixture.componentInstance.select();
			await openSelect(select, fixture);

			await scrollDocument(fixture);
			expect(select.isOpen()).toBeTruthy();
		});

		it('should close on document scroll when closeOnScroll is set', async () => {
			const fixture = createTestingModule(
				NgSelectTestComponent,
				`<ng-select [items]="cities" bindLabel="name" [closeOnScroll]="true" [(ngModel)]="selectedCity"></ng-select>`,
			);
			const select = fixture.componentInstance.select();
			await openSelect(select, fixture);

			await scrollDocument(fixture);
			expect(select.isOpen()).toBeFalsy();
			expect(fixture.debugElement.query(By.css('ng-dropdown-panel'))).toBeNull();
		});

		it('should use closeOnScroll from NgSelectConfig when not provided in template', async () => {
			const config = new NgSelectConfig();
			config.closeOnScroll = true;
			const fixture = createTestingModule(
				NgSelectTestComponent,
				`<ng-select [items]="cities" bindLabel="name" [(ngModel)]="selectedCity"></ng-select>`,
				config,
			);
			const select = fixture.componentInstance.select();
			await openSelect(select, fixture);

			await scrollDocument(fixture);
			expect(select.isOpen()).toBeFalsy();
		});
	});

	describe('Immediate close - DOM removal without external change detection (issue #2765)', () => {
		// close() uses detectChanges() internally to ensure the dropdown panel is
		// removed from the DOM immediately, without relying on zone-triggered CD.
		// This is critical in Angular 21 with provideZoneChangeDetection() where
		// event coalescing defers zone-triggered change detection.

		describe('Outside click', () => {
			it('should remove dropdown panel from DOM immediately', async () => {
				const fixture = createTestingModule(
					NgSelectTestComponent,
					`<div id="outside">Outside</div><br />
					<ng-select [items]="cities"
						bindLabel="name"
						[(ngModel)]="selectedCity">
					</ng-select>`,
				);

				triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
				await tickAndDetectChanges(fixture);
				expect(fixture.componentInstance.select().isOpen()).toBeTruthy();
				expect(fixture.debugElement.query(By.css('ng-dropdown-panel'))).not.toBeNull();

				document.getElementById('outside').click();

				expect(fixture.componentInstance.select().isOpen()).toBeFalsy();
				expect(fixture.debugElement.query(By.css('ng-dropdown-panel'))).toBeNull();
			});

			it('should remove appended dropdown panel from DOM immediately', async () => {
				const fixture = createTestingModule(
					NgSelectTestComponent,
					`<div id="outside">Outside</div><br />
					<ng-select [items]="cities"
						bindLabel="name"
						appendTo="body"
						[(ngModel)]="selectedCity">
					</ng-select>`,
				);

				triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
				await tickAndDetectChanges(fixture);
				expect(fixture.componentInstance.select().isOpen()).toBeTruthy();
				expect(document.querySelector('ng-dropdown-panel')).not.toBeNull();

				document.getElementById('outside').click();

				expect(fixture.componentInstance.select().isOpen()).toBeFalsy();
				expect(document.querySelector('ng-dropdown-panel')).toBeNull();
			});
		});

		describe('Escape key', () => {
			it('should remove dropdown panel from DOM immediately', async () => {
				const fixture = createTestingModule(
					NgSelectTestComponent,
					`<ng-select [items]="cities"
						bindLabel="name"
						[(ngModel)]="selectedCity">
					</ng-select>`,
				);

				triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
				await tickAndDetectChanges(fixture);
				expect(fixture.componentInstance.select().isOpen()).toBeTruthy();
				expect(fixture.debugElement.query(By.css('ng-dropdown-panel'))).not.toBeNull();

				triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Esc);

				expect(fixture.componentInstance.select().isOpen()).toBeFalsy();
				expect(fixture.debugElement.query(By.css('ng-dropdown-panel'))).toBeNull();
			});

			it('should remove appended dropdown panel from DOM immediately', async () => {
				const fixture = createTestingModule(
					NgSelectTestComponent,
					`<ng-select [items]="cities"
						bindLabel="name"
						appendTo="body"
						[(ngModel)]="selectedCity">
					</ng-select>`,
				);

				triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
				await tickAndDetectChanges(fixture);
				expect(fixture.componentInstance.select().isOpen()).toBeTruthy();
				expect(document.querySelector('ng-dropdown-panel')).not.toBeNull();

				triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Esc);

				expect(fixture.componentInstance.select().isOpen()).toBeFalsy();
				expect(document.querySelector('ng-dropdown-panel')).toBeNull();
			});
		});

		describe('Tab key', () => {
			it('should remove dropdown panel from DOM immediately', async () => {
				const fixture = createTestingModule(
					NgSelectTestComponent,
					`<ng-select [items]="cities"
						bindLabel="name"
						[(ngModel)]="selectedCity">
					</ng-select>`,
				);

				triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
				await tickAndDetectChanges(fixture);
				expect(fixture.componentInstance.select().isOpen()).toBeTruthy();
				expect(fixture.debugElement.query(By.css('ng-dropdown-panel'))).not.toBeNull();

				triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Tab);

				expect(fixture.componentInstance.select().isOpen()).toBeFalsy();
				expect(fixture.debugElement.query(By.css('ng-dropdown-panel'))).toBeNull();
			});

			it('should remove appended dropdown panel from DOM immediately', async () => {
				const fixture = createTestingModule(
					NgSelectTestComponent,
					`<ng-select [items]="cities"
						bindLabel="name"
						appendTo="body"
						[(ngModel)]="selectedCity">
					</ng-select>`,
				);

				triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
				await tickAndDetectChanges(fixture);
				expect(fixture.componentInstance.select().isOpen()).toBeTruthy();
				expect(document.querySelector('ng-dropdown-panel')).not.toBeNull();

				triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Tab);

				expect(fixture.componentInstance.select().isOpen()).toBeFalsy();
				expect(document.querySelector('ng-dropdown-panel')).toBeNull();
			});
		});

		describe('Option select', () => {
			it('should remove dropdown panel from DOM immediately when selecting an option', async () => {
				const fixture = createTestingModule(
					NgSelectTestComponent,
					`<ng-select [items]="cities"
						bindLabel="name"
						[(ngModel)]="selectedCity">
					</ng-select>`,
				);

				triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
				await tickAndDetectChanges(fixture);
				expect(fixture.componentInstance.select().isOpen()).toBeTruthy();
				expect(fixture.debugElement.query(By.css('ng-dropdown-panel'))).not.toBeNull();

				// Select first option via Enter key
				triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Enter);

				expect(fixture.componentInstance.select().isOpen()).toBeFalsy();
				expect(fixture.debugElement.query(By.css('ng-dropdown-panel'))).toBeNull();
			});

			it('should remove appended dropdown panel from DOM immediately when selecting an option', async () => {
				const fixture = createTestingModule(
					NgSelectTestComponent,
					`<ng-select [items]="cities"
						bindLabel="name"
						appendTo="body"
						[(ngModel)]="selectedCity">
					</ng-select>`,
				);

				triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
				await tickAndDetectChanges(fixture);
				expect(fixture.componentInstance.select().isOpen()).toBeTruthy();
				expect(document.querySelector('ng-dropdown-panel')).not.toBeNull();

				// Select first option via Enter key
				triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Enter);

				expect(fixture.componentInstance.select().isOpen()).toBeFalsy();
				expect(document.querySelector('ng-dropdown-panel')).toBeNull();
			});
		});

		describe('Arrow click', () => {
			it('should remove dropdown panel from DOM immediately', async () => {
				const fixture = createTestingModule(
					NgSelectTestComponent,
					`<ng-select [items]="cities"
						bindLabel="name"
						[(ngModel)]="selectedCity">
					</ng-select>`,
				);

				triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
				await tickAndDetectChanges(fixture);
				expect(fixture.componentInstance.select().isOpen()).toBeTruthy();
				expect(fixture.debugElement.query(By.css('ng-dropdown-panel'))).not.toBeNull();

				// Simulate arrow click via mousedown on ng-select-container
				const control = fixture.debugElement.query(By.css('.ng-select-container'));
				control.triggerEventHandler(
					'mousedown',
					createEvent({
						classList: { contains: (term) => term === 'ng-arrow-wrapper' },
					}),
				);

				expect(fixture.componentInstance.select().isOpen()).toBeFalsy();
				expect(fixture.debugElement.query(By.css('ng-dropdown-panel'))).toBeNull();
			});

			it('should remove appended dropdown panel from DOM immediately', async () => {
				const fixture = createTestingModule(
					NgSelectTestComponent,
					`<ng-select [items]="cities"
						bindLabel="name"
						appendTo="body"
						[(ngModel)]="selectedCity">
					</ng-select>`,
				);

				triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Space);
				await tickAndDetectChanges(fixture);
				expect(fixture.componentInstance.select().isOpen()).toBeTruthy();
				expect(document.querySelector('ng-dropdown-panel')).not.toBeNull();

				const control = fixture.debugElement.query(By.css('.ng-select-container'));
				control.triggerEventHandler(
					'mousedown',
					createEvent({
						classList: { contains: (term) => term === 'ng-arrow-wrapper' },
					}),
				);

				expect(fixture.componentInstance.select().isOpen()).toBeFalsy();
				expect(document.querySelector('ng-dropdown-panel')).toBeNull();
			});
		});
	});

	describe('Dropdown position', () => {
		it('should auto position dropdown to bottom by default', async () => {
			const fixture = createTestingModule(NgSelectTestComponent, `<ng-select [items]="cities"></ng-select>`);
			fixture.componentInstance.cities = [{ id: 1, name: 'New York' }];
			fixture.detectChanges();

			const select = fixture.componentInstance.select();
			select.open();
			await tickAndDetectChanges(fixture);

			expect(select.dropdownPosition()).toBe('auto');
			expect(['top', 'bottom']).toContain(select.currentPanelPosition);
		});

		it('should auto position dropdown to top if position input is set', async () => {
			const fixture = createTestingModule(NgSelectTestComponent, `<ng-select dropdownPosition="top" [items]="cities"></ng-select>`);
			fixture.componentInstance.cities = [{ id: 1, name: 'New York' }];
			fixture.detectChanges();

			const select = fixture.componentInstance.select();
			select.open();
			await tickAndDetectChanges(fixture);

			const selectClasses = (<HTMLElement>fixture.nativeElement).querySelector('.ng-select').classList;
			const panelClasses = document.querySelector('.ng-dropdown-panel').classList;
			expect(select.dropdownPosition()).toBe('top');
			expect(selectClasses.contains('ng-select-bottom')).toBeFalsy();
			expect(panelClasses.contains('ng-select-bottom')).toBeFalsy();
			expect(selectClasses.contains('ng-select-top')).toBeTruthy();
			expect(panelClasses.contains('ng-select-top')).toBeTruthy();
		});

		it('should auto position appended to body dropdown to bottom', async () => {
			const fixture = createTestingModule(NgSelectTestComponent, `<ng-select [items]="cities" appendTo="body"></ng-select>`);
			fixture.componentInstance.cities = [{ id: 1, name: 'New York' }];
			fixture.detectChanges();

			const select = fixture.componentInstance.select();
			select.open();
			await tickAndDetectChanges(fixture);

			expect(select.dropdownPosition()).toBe('auto');
			expect(['top', 'bottom']).toContain(select.currentPanelPosition);
		});

		it('should return current panel position', async () => {
			const fixture = createTestingModule(NgSelectTestComponent, `<ng-select [items]="cities" appendTo="body"></ng-select>`);
			fixture.componentInstance.cities = [{ id: 1, name: 'New York' }];
			fixture.detectChanges();

			const select = fixture.componentInstance.select();
			select.open();
			await tickAndDetectChanges(fixture);

			expect(['top', 'bottom']).toContain(select.currentPanelPosition);
		});

		it('should return undefined for current panel position if dropdown is closed', async () => {
			const fixture = createTestingModule(NgSelectTestComponent, `<ng-select [items]="cities" appendTo="body"></ng-select>`);
			fixture.componentInstance.cities = [{ id: 1, name: 'New York' }];
			fixture.detectChanges();

			const select = fixture.componentInstance.select();
			select.open();
			await tickAndDetectChanges(fixture);
			select.close();
			await tickAndDetectChanges(fixture);

			expect(select.currentPanelPosition).toBeUndefined();
		});
	});

	describe('Append to', () => {
		it('should not warn when appendTo is set', async () => {
			const warnSpy = vi.spyOn(MockConsole.prototype, 'warn');
			try {
				createTestingModule(
					NgSelectTestComponent,
					`<ng-select [items]="cities"
                        appendTo="body"
                        [(ngModel)]="selectedCity">
                </ng-select>`,
				);
				expect(warnSpy).not.toHaveBeenCalled();
			} finally {
				warnSpy.mockRestore();
			}
		});

		it('should not warn when appendTo is not set anywhere', async () => {
			const warnSpy = vi.spyOn(MockConsole.prototype, 'warn');
			try {
				createTestingModule(
					NgSelectTestComponent,
					`<ng-select [items]="cities"
                        [(ngModel)]="selectedCity">
                </ng-select>`,
				);
				expect(warnSpy).not.toHaveBeenCalled();
			} finally {
				warnSpy.mockRestore();
			}
		});

		it('should append the dropdown to a custom host element', async () => {
			const fixture = createTestingModule(
				NgSelectTestComponent,
				`
                <div class="container"></div>
                <ng-select [items]="cities"
                        appendTo=".container"
                        [(ngModel)]="selectedCity">
                </ng-select>`,
			);

			await openSelect(fixture.componentInstance.select(), fixture);
			const dropdown = <HTMLElement>document.querySelector('.container .ng-dropdown-panel');
			expect(dropdown).not.toBeNull();
		});

		it('should append the dropdown to body', async () => {
			const fixture = createTestingModule(
				NgSelectTestComponent,
				`<ng-select [items]="cities"
                        appendTo="body"
                        [(ngModel)]="selectedCity">
                </ng-select>`,
			);

			await openSelect(fixture.componentInstance.select(), fixture);
			const dropdown = <HTMLElement>document.querySelector('.ng-dropdown-panel');
			expect(dropdown).not.toBeNull();
			expect(dropdown.closest('ng-select')).toBeNull();
			expect(dropdown.closest('.cdk-overlay-container')).toBeNull();
		});

		it('should apply appendTo from NgSelectConfig', async () => {
			const config = new NgSelectConfig();
			config.appendTo = '.config-container';
			const fixture = createTestingModule(
				NgSelectTestComponent,
				`
                <div class="config-container"></div>
                <ng-select [items]="cities"
                        [(ngModel)]="selectedCity">
                </ng-select>`,
				config,
			);

			await openSelect(fixture.componentInstance.select(), fixture);
			expect(document.querySelector('.config-container .ng-dropdown-panel')).not.toBeNull();
		});

		it('should move the dropdown when appendTo changes between opens', async () => {
			const fixture = createTestingModule(
				NgSelectTestComponent,
				`
                <div class="container-a"></div>
                <div class="container-b"></div>
                <ng-select [items]="cities"
                        [appendTo]="appendToSelector"
                        [(ngModel)]="selectedCity">
                </ng-select>`,
			);
			const select = fixture.componentInstance.select();

			await openSelect(select, fixture);
			expect(document.querySelector('.container-a .ng-dropdown-panel')).not.toBeNull();

			select.close();
			await tickAndDetectChanges(fixture);
			fixture.componentInstance.appendToSelector = '.container-b';
			await tickAndDetectChanges(fixture);

			await openSelect(select, fixture);
			expect(document.querySelector('.container-b .ng-dropdown-panel')).not.toBeNull();
			expect(document.querySelector('.container-a .ng-dropdown-panel')).toBeNull();
		});

		it('should rebuild the overlay when the appendTo host element is replaced between opens', async () => {
			const fixture = createTestingModule(
				NgSelectTestComponent,
				`
                @if (visible) {
                    <div class="container-a"></div>
                }
                <ng-select [items]="cities"
                        appendTo=".container-a"
                        [(ngModel)]="selectedCity">
                </ng-select>`,
			);
			const select = fixture.componentInstance.select();

			await openSelect(select, fixture);
			expect(document.querySelector('.container-a .ng-dropdown-panel')).not.toBeNull();
			select.close();
			await tickAndDetectChanges(fixture);

			// The host is destroyed and rebuilt while the selector keeps matching — a dialog
			// that drops its DOM on close and recreates it on open (#2870)
			fixture.componentInstance.visible = false;
			await tickAndDetectChanges(fixture);
			fixture.componentInstance.visible = true;
			await tickAndDetectChanges(fixture);

			await openSelect(select, fixture);
			expect(document.querySelector('.container-a .ng-dropdown-panel')).not.toBeNull();
		});

		it('should throw for an appendTo selector that matches no element', async () => {
			const fixture = createTestingModule(
				NgSelectTestComponent,
				`<ng-select [items]="cities"
                        appendTo=".does-not-exist"
                        [(ngModel)]="selectedCity">
                </ng-select>`,
			);

			const select = fixture.componentInstance.select();
			expect(() => select.open()).toThrowError('appendTo selector .does-not-exist did not found any parent element');
			select.close();
			await tickAndDetectChanges(fixture);
		});

		it('should size the overlay pane to match the select width', async () => {
			const fixture = createTestingModule(
				NgSelectTestComponent,
				`
                <div style="width: 200px">
                    <ng-select [items]="cities"
                            bindLabel="name"
                            [(ngModel)]="selectedCity">
                    </ng-select>
                </div>`,
			);

			await openSelect(fixture.componentInstance.select(), fixture);
			const pane = <HTMLElement>document.querySelector('.cdk-overlay-pane');
			expect(pane.style.width).toBe('200px');
		});

		it('should pass static classes into dropdown panel', async () => {
			const fixture = createTestingModule(
				NgSelectTestComponent,
				`<ng-select [items]="cities"
                        class="someClass"
                        [(ngModel)]="selectedCity">
                </ng-select>`,
			);

			fixture.componentInstance.select().open();

			await tickAndDetectChanges(fixture);
			const dropdown = <HTMLElement>document.querySelector('.ng-dropdown-panel');
			expect(dropdown.classList.contains('someClass')).toBe(true);
		});

		it('should pass ngClass classes into dropdown panel', async () => {
			const fixture = createTestingModule(
				NgSelectTestComponent,
				`<ng-select [items]="cities"
                        [ngClass]="{ someClass: visible }"
                        [(ngModel)]="selectedCity">
                </ng-select>`,
			);

			fixture.componentInstance.visible = true;
			fixture.componentInstance.select().open();

			await tickAndDetectChanges(fixture);
			const dropdown = <HTMLElement>document.querySelector('.ng-dropdown-panel');
			expect(dropdown.classList.contains('someClass')).toBe(true);

			fixture.componentInstance.visible = false;
			await tickAndDetectChanges(fixture);

			expect(dropdown.classList.contains('someClass')).toBe(false);
		});

		it('should pass [class] binding classes into dropdown panel', async () => {
			const fixture = createTestingModule(
				NgSelectTestComponent,
				`<ng-select [items]="cities"
                        class="search-box"
                        [class]="dynamicClass"
                        [ngClass]="{ 'ng-class': visible }"
                        [(ngModel)]="selectedCity">
                </ng-select>`,
			);

			fixture.componentInstance.dynamicClass = 'dynamic-class';
			fixture.componentInstance.select().open();

			await tickAndDetectChanges(fixture);
			const dropdown = <HTMLElement>document.querySelector('.ng-dropdown-panel');
			expect(dropdown.classList.contains('search-box')).toBe(true);
			expect(dropdown.classList.contains('dynamic-class')).toBe(true);
			expect(dropdown.classList.contains('ng-class')).toBe(true);
			expect(dropdown.classList.contains('ng-valid')).toBe(false);
			expect(dropdown.classList.contains('ng-untouched')).toBe(false);
			expect(dropdown.classList.contains('ng-pristine')).toBe(false);

			fixture.componentInstance.dynamicClass = '';
			fixture.componentInstance.visible = false;
			await tickAndDetectChanges(fixture);

			expect(dropdown.classList.contains('dynamic-class')).toBe(false);
			expect(dropdown.classList.contains('ng-class')).toBe(false);
			expect(dropdown.classList.contains('search-box')).toBe(true);
		});

		it('should pass every supported panelClass value into dropdown panel', async () => {
			const fixture = createTestingModule(
				NgSelectTestComponent,
				`<ng-select [items]="cities"
                        class="someClass"
                        [panelClass]="panelClassBinding"
                        [(ngModel)]="selectedCity">
                </ng-select>`,
			);

			fixture.componentInstance.panelClassBinding = 'panel-only';
			await tickAndDetectChanges(fixture);
			fixture.componentInstance.select().open();
			await tickAndDetectChanges(fixture);

			const dropdown = <HTMLElement>document.querySelector('.ng-dropdown-panel');
			expect(dropdown.classList.contains('someClass')).toBe(true);
			expect(dropdown.classList.contains('panel-only')).toBe(true);

			fixture.componentInstance.panelClassBinding = 'panel-updated';
			await tickAndDetectChanges(fixture);

			expect(dropdown.classList.contains('panel-updated')).toBe(true);
			expect(dropdown.classList.contains('panel-only')).toBe(false);

			fixture.componentInstance.panelClassBinding = ['panel-array', 'panel-shared'];
			await tickAndDetectChanges(fixture);

			expect(dropdown.classList.contains('panel-array')).toBe(true);
			expect(dropdown.classList.contains('panel-shared')).toBe(true);
			expect(dropdown.classList.contains('panel-updated')).toBe(false);

			fixture.componentInstance.panelClassBinding = new Set(['panel-set', 'panel-shared']);
			await tickAndDetectChanges(fixture);

			expect(dropdown.classList.contains('panel-set')).toBe(true);
			expect(dropdown.classList.contains('panel-shared')).toBe(true);
			expect(dropdown.classList.contains('panel-array')).toBe(false);

			fixture.componentInstance.panelClassBinding = {
				'panel-map': true,
				'panel-disabled': false,
				someClass: false,
			};
			await tickAndDetectChanges(fixture);

			expect(dropdown.classList.contains('panel-map')).toBe(true);
			expect(dropdown.classList.contains('panel-disabled')).toBe(false);
			expect(dropdown.classList.contains('panel-set')).toBe(false);
			// panelClass is additive and cannot remove a class mirrored from the host.
			expect(dropdown.classList.contains('someClass')).toBe(true);
		});
	});

	describe('Inline dropdown', () => {
		const inlineTemplate = (attrs = '') =>
			`<ng-select [items]="cities" bindLabel="name" [(ngModel)]="selectedCity" ${attrs}></ng-select><div id="after">After</div>`;

		function panelElement(): HTMLElement {
			return document.querySelector<HTMLElement>('.ng-dropdown-panel');
		}

		it('should keep the overlay panel out of document flow by default', async () => {
			const fixture = createTestingModule(NgSelectTestComponent, inlineTemplate());
			const select = fixture.componentInstance.select();
			const after = document.getElementById('after');
			const hostHeight = select.element.offsetHeight;
			const afterTop = after.getBoundingClientRect().top;

			await openSelect(select, fixture);

			expect(select.element.contains(panelElement())).toBe(false);
			expect(panelElement().closest('.cdk-overlay-pane')).not.toBeNull();
			expect(select.element.offsetHeight).toBe(hostHeight);
			expect(after.getBoundingClientRect().top).toBe(afterTop);
		});

		it('should render the panel inside the host, in document flow, without a CDK overlay', async () => {
			const fixture = createTestingModule(NgSelectTestComponent, inlineTemplate('[inlineDropdown]="true"'));
			const select = fixture.componentInstance.select();
			const after = document.getElementById('after');
			const hostHeight = select.element.offsetHeight;
			const afterTop = after.getBoundingClientRect().top;

			await openSelect(select, fixture);

			const panel = panelElement();
			expect(panel.parentElement).toBe(select.element);
			expect(panel.previousElementSibling.classList).toContain('ng-select-container');
			expect(document.querySelector('.cdk-overlay-pane')).toBeNull();
			expect(select['dropdownOverlayRef']).toBeNull();
			expect(select.element.classList).toContain('ng-select-inline-dropdown');
			// The mirrored host classes exclude the framework-managed mode class
			expect(panel.classList).not.toContain('ng-select-inline-dropdown');
			expect(select.element.offsetHeight).toBeGreaterThan(hostHeight);
			expect(after.getBoundingClientRect().top).toBeGreaterThan(afterTop);
			expect(panel.getBoundingClientRect().width).toBe(select.element.getBoundingClientRect().width);
			expect(getComputedStyle(panel).opacity).toBe('1');
			expect(getComputedStyle(panel).display).toBe('block');
		});

		it('should always open below and ignore dropdownPosition', async () => {
			const fixture = createTestingModule(NgSelectTestComponent, inlineTemplate('inlineDropdown dropdownPosition="top"'));
			const select = fixture.componentInstance.select();
			await openSelect(select, fixture);

			expect(select.currentPanelPosition).toBe('bottom');
			expect(panelElement().classList).toContain('ng-select-bottom');
			expect(select.element.classList).toContain('ng-select-bottom');
		});

		it('should select an option on click', async () => {
			const fixture = createTestingModule(NgSelectTestComponent, inlineTemplate('inlineDropdown'));
			const select = fixture.componentInstance.select();
			await openSelect(select, fixture);

			await userEvent.click(select.element.querySelectorAll<HTMLElement>('.ng-option')[1]);
			await tickAndDetectChanges(fixture);

			expect(fixture.componentInstance.selectedCity).toEqual(fixture.componentInstance.cities[1]);
			expect(select.isOpen()).toBe(false);
			expect(panelElement()).toBeNull();
			// Park the pointer on the field so later panels don't open under it and get hover-marked
			await userEvent.hover(select.element.querySelector('.ng-select-container'));
		});

		it('should select an option with the keyboard', async () => {
			const fixture = createTestingModule(NgSelectTestComponent, inlineTemplate('inlineDropdown'));
			await selectOption(fixture, KeyCode.ArrowDown, 2);
			await tickAndDetectChanges(fixture);

			expect(fixture.componentInstance.selectedCity).toEqual(fixture.componentInstance.cities[2]);
		});

		it('should close on Escape', async () => {
			const fixture = createTestingModule(NgSelectTestComponent, inlineTemplate('inlineDropdown'));
			const select = fixture.componentInstance.select();
			await openSelect(select, fixture);

			triggerKeyDownEvent(getNgSelectElement(fixture), KeyCode.Esc);
			await tickAndDetectChanges(fixture);

			expect(select.isOpen()).toBe(false);
			expect(panelElement()).toBeNull();
		});

		it('should close on outside click and stay open on clicks inside the panel', async () => {
			const fixture = createTestingModule(NgSelectTestComponent, inlineTemplate('inlineDropdown multiple="true" [closeOnSelect]="false"'));
			const select = fixture.componentInstance.select();
			await openSelect(select, fixture);

			const items = panelElement().querySelector<HTMLElement>('.ng-dropdown-panel-items');
			items.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
			items.click();
			await tickAndDetectChanges(fixture);
			expect(select.isOpen()).toBe(true);

			const after = document.getElementById('after');
			after.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
			after.click();
			await tickAndDetectChanges(fixture);
			expect(select.isOpen()).toBe(false);
		});

		it('should set listbox ARIA wiring', async () => {
			const fixture = createTestingModule(NgSelectTestComponent, inlineTemplate('inlineDropdown'));
			const select = fixture.componentInstance.select();
			await openSelect(select, fixture);

			const input = select.element.querySelector('input');
			expect(input.getAttribute('aria-expanded')).toBe('true');
			expect(input.getAttribute('aria-controls')).toBe(select.dropdownId);
			expect(select.element.querySelector(`#${select.dropdownId}`).getAttribute('role')).toBe('listbox');
		});

		it('should render virtual scroll rows and emit scrollToEnd', async () => {
			const fixture = createTestingModule(
				NgSelectTestComponent,
				`<ng-select [items]="cities" bindLabel="name" inlineDropdown [virtualScroll]="true"></ng-select>`,
			);
			const onScrollToEnd = vi.fn();
			fixture.componentInstance.select().scrollToEnd.subscribe(onScrollToEnd);
			fixture.componentInstance.cities = Array.from({ length: 200 }, (_, i) => ({ id: i, name: `City ${i}` }));
			await tickAndDetectChanges(fixture);
			const select = fixture.componentInstance.select();
			await openSelect(select, fixture);
			await tickAndDetectChanges(fixture);

			const rendered = select.element.querySelectorAll('.ng-option').length;
			expect(rendered).toBeGreaterThan(0);
			expect(rendered).toBeLessThan(200);

			const scrollHost = panelElement().querySelector<HTMLElement>('.ng-dropdown-panel-items');
			scrollHost.scrollTop = scrollHost.scrollHeight;
			scrollHost.dispatchEvent(new Event('scroll'));
			await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
			await tickAndDetectChanges(fixture);

			expect(select.element.querySelector('.ng-option:last-child').textContent).toContain('City 199');
			expect(onScrollToEnd).toHaveBeenCalled();
		});

		it('should move the open panel between overlay and inline rendering when toggled', async () => {
			const fixture = createTestingModule(NgSelectTestComponent, inlineTemplate());
			const select = fixture.componentInstance.select();
			await openSelect(select, fixture);
			expect(panelElement().closest('.cdk-overlay-pane')).not.toBeNull();

			select.inlineDropdown.set(true);
			await tickAndDetectChanges(fixture);
			expect(document.querySelectorAll('.ng-dropdown-panel').length).toBe(1);
			expect(panelElement().parentElement).toBe(select.element);
			expect(document.querySelector('.cdk-overlay-pane .ng-dropdown-panel')).toBeNull();

			select.inlineDropdown.set(false);
			await tickAndDetectChanges(fixture);
			expect(document.querySelectorAll('.ng-dropdown-panel').length).toBe(1);
			expect(panelElement().closest('.cdk-overlay-pane')).not.toBeNull();
		});

		it('should follow an [inlineDropdown] binding while open', async () => {
			const fixture = createTestingModule(NgSelectTestComponent, inlineTemplate('[inlineDropdown]="inlineDropdown"'));
			const select = fixture.componentInstance.select();
			await openSelect(select, fixture);
			expect(panelElement().closest('.cdk-overlay-pane')).not.toBeNull();

			fixture.componentInstance.inlineDropdown = true;
			await tickAndDetectChanges(fixture);
			expect(document.querySelectorAll('.ng-dropdown-panel').length).toBe(1);
			expect(panelElement().parentElement).toBe(select.element);

			fixture.componentInstance.inlineDropdown = false;
			await tickAndDetectChanges(fixture);
			expect(document.querySelectorAll('.ng-dropdown-panel').length).toBe(1);
			expect(panelElement().closest('.cdk-overlay-pane')).not.toBeNull();
		});

		describe('keyboard events from panel templates', () => {
			const keydown = (target: Element, key: string) => target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

			it('should still navigate and select from the search input', async () => {
				const fixture = createTestingModule(NgSelectTestComponent, inlineTemplate('inlineDropdown'));
				const select = fixture.componentInstance.select();
				await openSelect(select, fixture);

				const next = select.itemsList.filteredItems[select.itemsList.markedIndex + 1].value;
				const input = select.element.querySelector('.ng-input input');
				keydown(input, KeyCode.ArrowDown);
				keydown(input, KeyCode.Enter);
				await tickAndDetectChanges(fixture);

				expect(fixture.componentInstance.selectedCity).toBe(next);
			});

			it('should keep the value on Backspace in an empty header input', async () => {
				const fixture = createTestingModule(
					NgSelectTestComponent,
					`<ng-select [items]="cities" bindLabel="name" inlineDropdown [multiple]="true" [(ngModel)]="selectedCities">
						<ng-template ng-header-tmp><input class="header-input" /></ng-template>
					</ng-select>`,
				);
				fixture.componentInstance.selectedCities = [fixture.componentInstance.cities[0], fixture.componentInstance.cities[1]];
				await tickAndDetectChanges(fixture);
				const select = fixture.componentInstance.select();
				await openSelect(select, fixture);

				keydown(select.element.querySelector('.header-input'), KeyCode.Backspace);
				await tickAndDetectChanges(fixture);

				expect(fixture.componentInstance.selectedCities.length).toBe(2);
				expect(select.selectedItems.length).toBe(2);
			});

			it('should not select or close on Enter in a footer input', async () => {
				const fixture = createTestingModule(
					NgSelectTestComponent,
					`<ng-select [items]="cities" bindLabel="name" inlineDropdown [(ngModel)]="selectedCity">
						<ng-template ng-footer-tmp><input class="footer-input" /></ng-template>
					</ng-select>`,
				);
				const select = fixture.componentInstance.select();
				await openSelect(select, fixture);

				const footerInput = select.element.querySelector('.footer-input');
				const event = new KeyboardEvent('keydown', { key: KeyCode.Enter, bubbles: true, cancelable: true });
				footerInput.dispatchEvent(event);
				await tickAndDetectChanges(fixture);

				expect(event.defaultPrevented).toBe(false);
				expect(select.isOpen()).toBe(true);
				expect(fixture.componentInstance.selectedCity).toBeUndefined();
			});

			it('should not type-to-select or move the marked option from a header input when not searchable', async () => {
				const fixture = createTestingModule(
					NgSelectTestComponent,
					`<ng-select [items]="cities" bindLabel="name" inlineDropdown [searchable]="false" [(ngModel)]="selectedCity">
						<ng-template ng-header-tmp><input class="header-input" /></ng-template>
					</ng-select>`,
				);
				const select = fixture.componentInstance.select();
				await openSelect(select, fixture);
				const marked = select.itemsList.markedItem;

				const headerInput = select.element.querySelector('.header-input');
				keydown(headerInput, 'l');
				keydown(headerInput, 'o');
				keydown(headerInput, KeyCode.ArrowDown);
				await new Promise((resolve) => setTimeout(resolve, 250));
				await tickAndDetectChanges(fixture);

				expect(select.itemsList.markedItem).toBe(marked);
				expect(select.isOpen()).toBe(true);
			});
		});

		it('should use inlineDropdown from NgSelectConfig when not provided in template', async () => {
			const config = new NgSelectConfig();
			config.inlineDropdown = true;
			const fixture = createTestingModule(NgSelectTestComponent, inlineTemplate(), config);
			const select = fixture.componentInstance.select();
			expect(select.inlineDropdown()).toBe(true);

			await openSelect(select, fixture);
			expect(panelElement().parentElement).toBe(select.element);
		});

		it('should warn that appendTo is ignored', async () => {
			const warnSpy = vi.spyOn(MockConsole.prototype, 'warn');
			try {
				createTestingModule(NgSelectTestComponent, inlineTemplate('inlineDropdown appendTo="body"'));
				expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('`appendTo` has no effect when `inlineDropdown`'));
			} finally {
				warnSpy.mockRestore();
			}
		});

		it('should remove the panel when the select is destroyed', async () => {
			const fixture = createTestingModule(NgSelectTestComponent, `@if (visible) {<ng-select [items]="cities" bindLabel="name" inlineDropdown></ng-select>}`);
			await openSelect(fixture.componentInstance.select(), fixture);
			expect(panelElement()).not.toBeNull();

			fixture.componentInstance.visible = false;
			await tickAndDetectChanges(fixture);
			expect(panelElement()).toBeNull();
			expect(document.querySelector('.cdk-overlay-pane')).toBeNull();
		});
	});

	describe('Overlay edge cases', () => {
		it('should snapshot rtl direction when opening', async () => {
			const fixture = createTestingModule(NgSelectTestComponent, `<ng-select [items]="cities" bindLabel="name"></ng-select>`);

			const previousDir = document.documentElement.dir;
			document.documentElement.dir = 'rtl';
			try {
				const select = fixture.componentInstance.select();
				await openSelect(select, fixture);

				expect(document.querySelector('.ng-dropdown-panel').closest('[dir="rtl"]')).not.toBeNull();
			} finally {
				document.documentElement.dir = previousDir;
			}
		});

		it('should resolve appendTo selectors against the shadow root of the select', async () => {
			const fixture = createTestingModule(
				EncapsulatedTestComponent,
				`
                <div class="shadow-append-host"></div>
                <ng-select [items]="cities"
                        bindLabel="name"
                        appendTo=".shadow-append-host"
                        [(ngModel)]="city"></ng-select>`,
			);

			const select = fixture.componentInstance.select();
			await openSelect(select, fixture);

			const root = select.element.getRootNode() as ShadowRoot;
			expect(root instanceof ShadowRoot).toBe(true);
			expect(root.querySelector('.shadow-append-host .ng-dropdown-panel')).not.toBeNull();
		});
	});

	describe('Template event bindings', () => {
		it('should stop propagation of native change events from the search input', () => {
			const fixture = createTestingModule(NgSelectTestComponent, `<ng-select [items]="cities" bindLabel="name"></ng-select>`);

			const input: HTMLInputElement = fixture.nativeElement.querySelector('.ng-input input');
			const changeListener = vi.fn();
			getNgSelectNativeElement(fixture).addEventListener('change', changeListener);
			input.dispatchEvent(new Event('change', { bubbles: true }));

			expect(changeListener).not.toHaveBeenCalled();
		});

		it('should filter with the input value on native compositionend', async () => {
			const fixture = createTestingModule(NgSelectTestComponent, `<ng-select [items]="cities" bindLabel="name" [searchWhileComposing]="false"></ng-select>`);

			const input: HTMLInputElement = fixture.nativeElement.querySelector('.ng-input input');
			input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
			input.value = 'new';
			input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
			await tickAndDetectChanges(fixture);

			expect(fixture.componentInstance.select().searchTerm).toBe('new');
		});

		it('should re-emit dropdown panel scroll events', async () => {
			const fixture = createTestingModule(NgSelectTestComponent, `<ng-select [items]="cities" bindLabel="name"></ng-select>`);

			const select = fixture.componentInstance.select();
			await openSelect(select, fixture);

			const emitted: { start: number; end: number }[] = [];
			select.scroll.subscribe((event) => emitted.push(event));
			select.dropdownPanel().scroll.emit({ start: 0, end: 5 });

			expect(emitted).toEqual([{ start: 0, end: 5 }]);
		});
	});
});
