import { Drag } from './drag'
import { Position, Size } from './types'

export type NodeTranslateEventParams = { position: Position, previous: Position }
export type NodeResizeEventParams = { size: Size }

type Events = {
  picked: () => void
  translated: (params: NodeTranslateEventParams, metadata?: any) => Promise<unknown | boolean>
  dragged: () => void
  contextmenu: (event: MouseEvent) => void
  resized: (params: NodeResizeEventParams) => Promise<unknown | boolean>
}
type Guards = {
  resize: (params: NodeResizeEventParams) => Promise<unknown | boolean>
  translate: (params: NodeTranslateEventParams, metadata?: any) => Promise<unknown | boolean>
}

export class NodeView {
  element: HTMLElement
  position: Position
  dragHandler: Drag

  constructor(private getZoom: () => number, private events: Events, private guards: Guards) {
    this.element = document.createElement('div')
    this.element.style.position = 'absolute'
    this.position = { x: 0, y: 0 }
    this.translate(0, 0, { passive: true, source: 'nodeViewConstructor' })

    this.element.addEventListener('contextmenu', event => this.events.contextmenu(event))

    this.dragHandler = new Drag()
    this.dragHandler.initialize(
      this.element,
      {
        getCurrentPosition: () => this.position,
        getZoom: () => this.getZoom()
      },
      {
        start: this.events.picked,
        translate: (x, y, e, metadata) => this.translate(x, y, metadata),
        drag: this.events.dragged
      }
    )
  }

  public translate = async (x: number, y: number, metadata?: any) => {
    type Params = undefined | { data: NodeTranslateEventParams }
    const previous = { ...this.position }
    const translation = await this.guards.translate({ previous, position: { x, y } }, metadata) as Params

    if (!translation) return false

    this.position = { ...translation.data.position }
    this.element.style.transform = `translate(${this.position.x}px, ${this.position.y}px)`

    await this.events.translated({ position: this.position, previous }, metadata)

    return true
  }

  public resize = async (width: number, height: number) => {
    const size = { width, height }

    if (!(await this.guards.resize({ size }))) return false

    const el = this.element.children.item(0)

    if (!el || !(el instanceof HTMLElement)) return false

    el.style.width = `${width}px`
    el.style.height = `${height}px`

    await this.events.resized({ size })

    return true
  }

  public destroy() {
    this.dragHandler.destroy()
  }
}
