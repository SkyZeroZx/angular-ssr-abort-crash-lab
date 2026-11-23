import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Subject, Subscription } from 'rxjs';

@Component({
  selector: 'app-profile',
  template: '<p>{{ name() }}</p>',
})
export class Profile implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? 'alice';
  private readonly updates = new Subject<string>();
  private subscription!: Subscription;
  protected readonly name = signal('');

  ngOnInit() {
    this.http.get<{ name: string }>(`http://127.0.0.1:4400/api/users/${this.id}`).subscribe({
      next: ({ name }) => {
        this.name.set(name);
        this.subscription = this.updates.subscribe((next) => this.name.set(next));
      },
      error: () => this.name.set('User not found'),
    });
  }

  ngOnDestroy() {
    // undefined if the visitor left before the answer, or if the call failed
    this.subscription.unsubscribe();
  }
}
