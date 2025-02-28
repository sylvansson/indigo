---
id: animation
title: Animation
---

There are two type of animations found in Indigo.

1. Timeline / Key frame based animations.
1. Procedural / programmed animations.

## Timeline Animations

Indigo is a "code-only" game engine, there is no GUI or asset creation pipeline. As such, the expectation is that you'll use another tool in order to manufacture animation sprite sheets, and import them into Indigo.

An example of this is that Indigo has support for [Aseprite](https://www.aseprite.org/) (an excellent pixel art editor and animation tool), and the process is:

1. Create your animation in Aseprite.
1. Export the animations and frames as a sprite sheet and a JSON description.
1. Add the sprite sheet and JSON description as a static asset to Indigo.
1. During startup, use the `AsepriteConverter` and indigo's (confusingly named) `JSON` object to parse the JSON into an `Animation` instance, and add it to the `Startup` result type, thereby making it available to your game.

You can then either turn that into a `Sprite` or a series of `Clip`s.

For `Sprite`s:

1. You can create a `Sprite` from the loaded `Aseprite` and associate it to the Animation using an `AnimationKey`.
1. In your game view logic, you can then control the animation by calling the animation methods on the sprite: `play`, `changeCycle`, `jumpToFirstFrame`, `jumpToLastFrame`, and `jumpToFrame`.

Or, for `Clip`s, you can create a `Map` of `CycleLabel -> Clip` from the loaded `Aseprite` and insert them into your game scene.

See the [Sprite example](https://github.com/PurpleKingdomGames/indigo/blob/master/examples/sprite/src/main/scala/indigoexamples/SpriteExample.scala) for a very basic, hand rolled animation example.

>Caution: If two sprites have the same animation key they will play the same animation in the same place using the same cycle - or more correctly - whatever the latter sprite instructed the animation to do. This is very useful! ...but can also cause confusion.

### Registering animations (for `Sprite`s)

Animations are registered in two ways:

1. During boot up, which happens exactly once.
2. As part of the set up process on the resulting `Startup` data type, which is called whenever new assets are loaded.

You can think of boot and setup as "nothing happens until I've finished" and "the game could be running by now" respectively. The idea of allowing you to load assets and add animations during boot is that you may need a minimal set of data to show such things as loading animations (AKA preloaders).

During boot, how you add your animations depends on the entry point you are using.

With `IndigoSandbox` you will add your animations to:

```scala
val animations: Set[Animation] = Set(myAnimation)
```

However, to add an animation to the boot sequence of `IndigoDemo` or `IndigoGame`, you will need to add them to the `BootResult`:

```scala
BootResult.noData(GameConfig.default).addAnimations(myAnimation)
```

During setup, you can add an animation like this:

```scala
Startup.Success(()).addAnimations(spriteAndAnimations.animations)
```

The advantage of adding animations during the set up stage is that they can be based on loaded data, for example an imported Aseprite animation.

### Structure

An instance of an animation actually contains at least one sub-animation, called a `Cycle`. `Cycle`s are animations of the same subject matter doing different things. For example: If you export a sprite sheet for you character, your sheet will contain several animations cycles such as an idle cycle, a walk cycle, a jump cycle etc.

## Procedural Animations

Procedural animations are any animations and movements produced as a result of code execution, and can be seen in a few forms, notably:

- Hand coded animations
- Signals & Signal Functions

### Hand crafted code

It is entirely reasonable to just do the animation yourself - you're a capable programmer after all! How hard can it be to make something move across the screen?

The main gotcha to be aware of with this kind of programming, is that the amount of time that passes between frames is not consistent. In other words, you can't add `1` to a characters `x` position and expect it to move smoothly across the screen.

All movement must therefore be described in terms of the amount of time that has passed, and there are a few helpful functions on the `GameTime` instance you are supplied with to help you do that.

Timeline animations and Signals already have time either taken care of or factored into the equation for you in some way or other.

### Signals & Signal Functions

Signals in Indigo are pretty simplistic as Signal implementations go, and yet are extremely useful.

As a brief introduction to `Signal`s, a signal is a value of type: `t: Seconds -> A` where `t` is the current time and `A` is _some value of `A` to produce based on a time `t`_.

For example:

```scala mdoc:silent
import indigo._

// a signal that outputs 10 'units' per second
val signal: Signal[Double] = Signal(t => t.toDouble * 10)

signal.at(Seconds(0.0)) // 0
signal.at(Seconds(1.0)) // 10
signal.at(Seconds(1.5)) // 15
signal.at(Seconds(2.0)) // 20
```

You can also use them to bend time:

```scala mdoc:silent
signal.affectTime(0.5).at(Seconds(2.0)) // 10
signal.affectTime(1.0).at(Seconds(2.0)) // 20
signal.affectTime(1.5).at(Seconds(2.0)) // 30
```

There are a range of pre-made Signal types you can play with, such as `Lerp` and `Orbit`, but the power of them is that you can combine and transform them.

Signals themselves are Functors up to Monad and compose in all the usual ways.

`SignalFunction`s are Signal combinators. Combinators are functions that take a function and return a function, in this case: `Signal[A] => Signal[B]` which is really:

`(t: Seconds -> A) -> (t: Seconds -> B)`

That's getting complicated but luckily Signal functions, being functors, can be created from any function `A => B`, which is much easier to think about.

Signal functions in indigo have only two operations:

```scala
// Operation 1: "and then" function composition. `andThen` and it's alias `>>>`
def >>>[C](other: SignalFunction[B, C]): SignalFunction[A, C] = ???
def andThen[C](other: SignalFunction[B, C]): SignalFunction[A, C] = ???

//Operation 2: Parallel input. Run A => B & A => C and return (B, C)
def &&&[C](other: SignalFunction[A, C]): SignalFunction[A, (B, C)] = ???
def and[C](other: SignalFunction[A, C]): SignalFunction[A, (B, C)] = ???
```

Example, one could calculate an orbit like this:

```scala mdoc:silent
val xPos: SignalFunction[Radians, Double] =
  SignalFunction(r => Math.sin(r.toDouble))

val yPos: SignalFunction[Radians, Double] =
  SignalFunction(r => Math.cos(r.toDouble))

def distance(d: Double): SignalFunction[(Double, Double), (Int, Int)] =
  SignalFunction {
    case (x, y) =>
      ((x * d).toInt, (y * d).toInt)
  }

def giveCords(range: Int): Signal[(Int, Int)] =
  Signal(t => Radians.fromSeconds(t)) |> (xPos &&& yPos) >>> distance(range)
```

Then calling `giveCords(100).at(t)` with different values of `t` would give you various positions on an orbit with a distance of 100 around a world 0,0 coordinate where 1 full orbit takes 1 second.

It works by:

1. Making a `Signal` representing the angle in radians based on the time.
2. Parallel running the angle through the `xPos` and `yPos` `SignalFunction`s to get the `x` and `y` in a range of -1 to +1.
3. Piping the xy through the `distance` `SignalFuction` to shift the coordinates out the desired range.
