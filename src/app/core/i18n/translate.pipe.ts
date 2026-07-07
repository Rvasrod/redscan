import { Pipe, PipeTransform, inject } from '@angular/core';
import { LocaleService } from './locale.service';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private readonly locale = inject(LocaleService);

  transform(key: string | null | undefined, fallback?: string): string {
    if (!key) return '';
    return this.locale.translate(key, fallback);
  }
}
