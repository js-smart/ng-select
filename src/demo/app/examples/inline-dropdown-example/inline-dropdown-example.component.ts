import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectComponent } from '@ng-select/ng-select';
import { Observable } from 'rxjs';
import { DataService, Person } from '../data.service';

interface NumberedItem {
	id: number;
	label: string;
}

@Component({
	selector: 'ng-inline-dropdown-example',
	templateUrl: './inline-dropdown-example.component.html',
	styleUrls: ['./inline-dropdown-example.component.scss'],
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [NgSelectComponent, FormsModule, AsyncPipe],
})
export class InlineDropdownExampleComponent {
	private readonly dataService = inject(DataService);

	readonly people$: Observable<Person[]> = this.dataService.getPeople();
	readonly numbers: NumberedItem[] = Array.from({ length: 1000 }, (_, i) => ({ id: i + 1, label: `Item #${i + 1}` }));
	selected: Person | null = null;
	selectedMany: number[] = [];
}
