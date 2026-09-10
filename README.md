# CSS modules: `@value` substitution results are inconsistently scoped (animation names, selectors)

An ICSS `@value` is plain-text substitution. When the substituted text is used in a
selector, the native CSS-modules implementations of webpack and rspack emit it **as
is** (no module scoping) - which is the sensible behavior, since a value can also be
imported from another file or package (`@value x from "..."`) where local scoping is
meaningless.

But when the same kind of value is used as an animation name, no implementation
follows that convention, and in both webpack (`experiments.css`) and rspack the
emitted `animation` declaration and `@keyframes` rule names do not even match each
other, so the animation silently never runs. css-loader produces matching names, but
scopes them - inconsistent with the as-is emission for selectors.

Tested with webpack 5.108.4, rspack 2.2.3, css-loader 7.1.4. Native configs:
`experiments: { css: true }`, single rule `{ test: /\.css$/, type: "css/module" }`,
no loaders. css-loader config: `{ loader: "css-loader", options: { modules: true } }`.

## Reproduce

```sh
npm install
npm run build
```

## Input CSS

```css
@value sel: .globalThing;
@value animName: pulseAnim;

sel {
    color: blue;
}

.anim {
    animation: animName 2s linear;
}

@keyframes animName {
    from { opacity: 0; }
}
```

## Webpack output (native `css/module`)

```css
.globalThing {
    color: blue;
}

.css-modules-value-animation-src_index_css-anim {
    animation: css-modules-value-animation-src_index_css-pulseAnim 2s linear;
}

@keyframes css-modules-value-animation-src_index_css-pulseAnimpulseAnim {
    from { opacity: 0; }
}
```

The selector value is emitted as-is, but the animation name is substituted **and
hashed**, and the `@keyframes` prelude ends up with the substituted name **doubled**
(`…-pulseAnimpulseAnim`) - the two names never match.

## Rspack output (native `css/module`)

```css
.globalThing {
    color: blue;
}

.css-modules-value-animation-src_index_css-anim {
    animation: pulseAnim 2s linear;
}

@keyframes css-modules-value-animation-src_index_css-animName {
    from { opacity: 0; }
}
```

The selector value is emitted as-is, and the `animation` declaration correctly emits
the substituted value as-is too - but the `@keyframes` prelude is **not substituted
at all**: the original `@value` variable name is hashed instead (`…-animName`). The
names never match.

## Webpack + css-loader output

```css
.XbSZ44YRvgGzLB6rR_A1 {
    color: blue;
}

.SePCFMv0ilKIpBAzT_uP {
    animation: rdfEYemqtlmpyJHiLcG6 2s linear;
}

@keyframes rdfEYemqtlmpyJHiLcG6 {
    from { opacity: 0; }
}
```

css-loader at least produces matching animation names, so the animation runs - but it
**hashes** the substituted text in both positions, including the selector
(`.globalThing` becomes `.XbSZ44YRvgGzLB6rR_A1`). That contradicts the as-is emission
the native implementations use for selectors, and renames identifiers that a value
imported from elsewhere may rely on.

## Expected output

Substituted `@value` text should be emitted as-is in every position, consistently
with how the native implementations already treat selectors:

```css
.globalThing {
    color: blue;
}

.<scoped>-anim {
    animation: pulseAnim 2s linear;
}

@keyframes pulseAnim {
    from { opacity: 0; }
}
```

(Only `.anim`, a regular local class, is module-scoped. `pulseAnim` comes from a
`@value` and is treated as global, matching in both the declaration and the
`@keyframes` prelude.)
