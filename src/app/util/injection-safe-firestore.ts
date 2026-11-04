import { EnvironmentInjector, runInInjectionContext } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreCollection,
  AngularFirestoreDocument
} from '@angular/fire/compat/firestore';

/**
 * From AngularFire 19, the compat Firestore wrappers (AngularFirestoreCollection,
 * AngularFirestoreDocument, AngularFirestoreCollectionGroup) call inject() in
 * their constructors. So `afs.collection()` / `afs.doc()` / `afs.collectionGroup()`,
 * and a wrapper's own `.doc()` / `.collection()`, throw NG0203 unless called in
 * an injection context. This app calls them from ngOnInit, event handlers and
 * service methods, which aren't one.
 *
 * This patches those five methods, once, to create the wrappers in the root
 * injector's context (the wrappers only use it for PendingTasks). It patches
 * the prototypes rather than providing a replacement AngularFirestore because
 * AngularFirestore is `providedIn: 'any'`: every lazy-loaded module gets its
 * own instance, which a root-level replacement doesn't reach. Called from an
 * environment initializer in AppModule.
 */
export function makeAngularFirestoreInjectionSafe(injector: EnvironmentInjector): void {
  const targets: Array<[object, string]> = [
    [AngularFirestore.prototype, 'collection'],
    [AngularFirestore.prototype, 'collectionGroup'],
    [AngularFirestore.prototype, 'doc'],
    [AngularFirestoreCollection.prototype, 'doc'],
    [AngularFirestoreDocument.prototype, 'collection']
  ];
  for (const [prototype, method] of targets) {
    const original = (prototype as any)[method];
    if (original.injectionSafe) continue;
    const safe = function (this: unknown, ...args: unknown[]) {
      return runInInjectionContext(injector, () => original.apply(this, args));
    };
    safe.injectionSafe = true;
    (prototype as any)[method] = safe;
  }
}
