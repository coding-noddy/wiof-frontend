import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreCollection,
  AngularFirestoreCollectionGroup,
  AngularFirestoreDocument,
  CollectionReference,
  DocumentReference,
  QueryFn,
  QueryGroupFn
} from '@angular/fire/compat/firestore';

/**
 * AngularFirestore, provided in place of AngularFire's own (see AppModule).
 *
 * From AngularFire 19, the compat wrappers (AngularFirestoreCollection,
 * AngularFirestoreDocument, AngularFirestoreCollectionGroup) call inject() in
 * their constructors. So `afs.collection()` / `afs.doc()`, and a wrapper's own
 * `.doc()` / `.collection()`, throw NG0203 unless called in an injection
 * context. This app calls them from ngOnInit, event handlers and service
 * methods, which aren't one. This subclass creates every wrapper inside its
 * injector's context, so call sites don't change.
 */
@Injectable()
export class InjectionSafeAngularFirestore extends AngularFirestore {
  private readonly environmentInjector = inject(EnvironmentInjector);

  override collection<T>(pathOrRef: string | CollectionReference, queryFn?: QueryFn): AngularFirestoreCollection<T> {
    return this.guard(this.inContext(() => super.collection<T>(pathOrRef as string, queryFn)));
  }

  override collectionGroup<T>(collectionId: string, queryGroupFn?: QueryGroupFn<T>): AngularFirestoreCollectionGroup<T> {
    return this.inContext(() => super.collectionGroup<T>(collectionId, queryGroupFn));
  }

  override doc<T>(pathOrRef: string | DocumentReference): AngularFirestoreDocument<T> {
    return this.guard(this.inContext(() => super.doc<T>(pathOrRef as string)));
  }

  private inContext<R>(create: () => R): R {
    return runInInjectionContext(this.environmentInjector, create);
  }

  /** Makes a wrapper's own `.doc()` (collections) / `.collection()` (documents) safe too. */
  private guard<W extends object>(wrapper: W): W {
    for (const method of ['doc', 'collection']) {
      const original = (wrapper as any)[method];
      if (typeof original === 'function') {
        (wrapper as any)[method] = (...args: unknown[]) =>
          this.guard(this.inContext(() => original.apply(wrapper, args)));
      }
    }
    return wrapper;
  }
}
