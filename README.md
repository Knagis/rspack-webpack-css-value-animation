# CSS modules: `@value` used as an animation / `@keyframes` name breaks in native CSS support

When a `@value` is used to name an animation, both webpack (`experiments.css`) and
rspack produce an `animation` declaration and a `@keyframes` rule whose names do not
match, so the animation silently never runs. Each bundler fails differently.

Tested with webpack 5.108.4 and rspack 2.2.3, identical configs
(`experiments: { css: true }`, single rule `{ test: /\.css$/, type: "css/module" }`,
no loaders).

## Reproduce

```sh
npm install
npm run build
```

## Input CSS

```css
@value animName: pulseAnim;

.anim {
    animation: animName 2s linear;
}

@keyframes animName {
    from { opacity: 0; }
}
```

## Webpack output

```css
.css-modules-value-animation-src_index_css-anim {
    animation: css-modules-value-animation-src_index_css-pulseAnim 2s linear;
}

@keyframes css-modules-value-animation-src_index_css-pulseAnimpulseAnim {
    from { opacity: 0; }
}
```

The declaration value is substituted and hashed (`…-pulseAnim`), but the `@keyframes`
prelude ends up with the substituted name **doubled** (`…-pulseAnimpulseAnim`), so the
two names never match.

## Rspack output

```css
.css-modules-value-animation-src_index_css-anim {
    animation: pulseAnim 2s linear;
}

@keyframes css-modules-value-animation-src_index_css-animName {
    from { opacity: 0; }
}
```

The declaration value is substituted but **not** hashed (`pulseAnim`), while the
`@keyframes` prelude is **not** substituted at all — the original `@value` variable
name is hashed instead (`…-animName`). The two names never match either.

## Expected

The substituted animation name in the declaration and the `@keyframes` name should
resolve to the same (module-scoped) identifier, as they do when the name is written
literally without `@value`.
