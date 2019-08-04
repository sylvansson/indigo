package indigo.platform.renderer

import indigo.shared.platform.Renderer
import indigo.shared.platform.RendererConfig

import org.scalajs.dom
import org.scalajs.dom.raw.WebGLRenderingContext
import org.scalajs.dom.{Element, html, raw}
import scala.scalajs.js.Dynamic

object RendererInit {

  @SuppressWarnings(Array("org.wartremover.warts.Var"))
  private var renderer: Option[Renderer] = None

  def apply(config: RendererConfig, loadedTextureAssets: List[LoadedTextureAsset], canvas: html.Canvas): Renderer =
    renderer match {
      case Some(r) => r
      case None =>
        val cNc = setupContextAndCanvas(canvas, config.magnification, config.antiAliasing)

        val r = new RendererImpl(config, loadedTextureAssets, cNc)
        r.init()

        renderer = Some(r)
        r
    }

  @SuppressWarnings(Array("org.wartremover.warts.NonUnitStatements", "org.wartremover.warts.AsInstanceOf"))
  def createCanvas(width: Int, height: Int, parent: Element): html.Canvas = {
    val canvas: html.Canvas = dom.document.createElement("canvas").asInstanceOf[html.Canvas]
    parent.appendChild(canvas)
    canvas.id = "indigo"
    canvas.width = width
    canvas.height = height

    canvas
  }

  @SuppressWarnings(Array("org.wartremover.warts.AsInstanceOf"))
  private def getContext(canvas: html.Canvas, antiAliasing: Boolean): WebGLRenderingContext = {
    val args =
      Dynamic.literal("premultipliedAlpha" -> false, "alpha" -> false, "antialias" -> antiAliasing)

    (canvas.getContext("webgl2", args)).asInstanceOf[raw.WebGLRenderingContext]
  }

  private def setupContextAndCanvas(canvas: html.Canvas, magnification: Int, antiAliasing: Boolean): ContextAndCanvas =
    new ContextAndCanvas(
      context = getContext(canvas, antiAliasing),
      canvas = canvas,
      magnification = magnification
    )

}
