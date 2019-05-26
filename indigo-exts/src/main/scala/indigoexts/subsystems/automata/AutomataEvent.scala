package indigoexts.subsystems.automata

import indigo.shared.events.GlobalEvent
import indigo.shared.datatypes.{BindingKey, Point}
import indigo.shared.time.Millis

sealed trait AutomataEvent extends GlobalEvent
object AutomataEvent {
  final case class Spawn(key: AutomataPoolKey, at: Point, lifeSpan: Option[Millis], payload: Option[AutomatonPayload]) extends AutomataEvent
  final case class KillAllInPool(key: AutomataPoolKey)    extends AutomataEvent
  final case class KillByKey(key: BindingKey)             extends AutomataEvent
  case object KillAll                                     extends AutomataEvent
  case object Cull                                        extends AutomataEvent
}
