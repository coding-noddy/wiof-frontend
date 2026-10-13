// quill-image-resize-module reads `window.Quill` the moment it is imported,
// so this side-effect import must come before it. Quill used to be a global
// <script> in angular.json, loaded for every visitor; now it is only bundled
// with the admin pages that need it.
import Quill from 'quill';

(window as any).Quill = Quill;
