import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { carouselIndex } from '../pages/organizer/events.page';
import { Sheet, shouldDismiss } from './sheet';

describe('carouselIndex', () => {
  it('finds the card in the middle of the carousel', () => {
    // Cards 300px wide with a 12px gap: the second card is centered at 312px.
    expect(carouselIndex(0, 300, 12, 4)).toBe(0);
    expect(carouselIndex(312, 300, 12, 4)).toBe(1);
    expect(carouselIndex(470, 300, 12, 4)).toBe(2);
    expect(carouselIndex(5000, 300, 12, 4)).toBe(3);
    expect(carouselIndex(0, 0, 12, 0)).toBe(0);
  });
});

describe('Sheet', () => {
  it('closes after a long drag or a quick flick, and stays open after a small nudge', () => {
    expect(shouldDismiss(120, 400)).toBe(true);
    expect(shouldDismiss(40, 40)).toBe(true);
    expect(shouldDismiss(30, 300)).toBe(false);
    expect(shouldDismiss(-50, 100)).toBe(false);
  });

  @Component({
    imports: [Sheet],
    template: `@if (open()) { <app-sheet label="Test" (closed)="open.set(false)"><button>Inside</button></app-sheet> }`,
  })
  class Host {
    readonly open = signal(true);
  }

  it('closes with the Escape key or the backdrop', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[role=dialog]')?.textContent).toContain('Inside');

    el.querySelector('app-sheet')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(el.querySelector('app-sheet')).toBeNull();

    fixture.componentInstance.open.set(true);
    await fixture.whenStable();
    (el.querySelector('.scrim') as HTMLElement).click();
    await fixture.whenStable();
    expect(el.querySelector('app-sheet')).toBeNull();
  });
});
