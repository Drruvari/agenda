import SwiftUI
import PencilKit

final class AgendaCanvasView: PKCanvasView {
    var onWindowChange: ((UIWindow?) -> Void)?

    override func didMoveToWindow() {
        super.didMoveToWindow()
        let currentWindow = window
        DispatchQueue.main.async { [weak self] in
            guard let self, self.window === currentWindow else { return }
            self.onWindowChange?(currentWindow)
        }
    }
}

struct InkCanvas: UIViewRepresentable {
    @Binding var document: InkDocument
    @Binding var drawing: Bool
    var pencilOnly = false
    var undoToken = 0
    var clearToken = 0

    func makeCoordinator() -> Coordinator {
        Coordinator(document: $document)
    }

    func makeUIView(context: Context) -> AgendaCanvasView {
        let canvas = AgendaCanvasView()
        canvas.delegate = context.coordinator
        canvas.backgroundColor = .clear
        canvas.isOpaque = false
        canvas.alwaysBounceVertical = true
        canvas.drawingPolicy = pencilOnly ? .pencilOnly : .anyInput
        canvas.drawingGestureRecognizer.isEnabled = drawing
        canvas.isUserInteractionEnabled = true

        context.coordinator.canvas = canvas
        context.coordinator.drawing = drawing

        canvas.onWindowChange = { [weak coordinator = context.coordinator] window in
            guard let coordinator, let canvas = coordinator.canvas else { return }
            if window != nil {
                coordinator.attachToolPicker(for: canvas)
            } else {
                coordinator.detachToolPicker(for: canvas)
            }
        }

        context.coordinator.load(document, into: canvas)
        return canvas
    }

    func updateUIView(_ canvas: AgendaCanvasView, context: Context) {
        canvas.drawingPolicy = pencilOnly ? .pencilOnly : .anyInput
        canvas.drawingGestureRecognizer.isEnabled = drawing
        canvas.isUserInteractionEnabled = true
        context.coordinator.drawing = drawing

        if canvas.window != nil {
            context.coordinator.updateToolPickerVisibility(for: canvas)
        }

        if undoToken != context.coordinator.undoToken {
            context.coordinator.undoToken = undoToken
            canvas.undoManager?.undo()
        }

        if clearToken != context.coordinator.clearToken {
            context.coordinator.clearToken = clearToken
            canvas.drawing = PKDrawing()
            context.coordinator.save(canvas.drawing)
            return
        }

        if !context.coordinator.isSaving {
            let currentEncoded = document.pencilKitData
            if context.coordinator.loadedData != currentEncoded {
                context.coordinator.load(document, into: canvas)
            }
        }
    }

    final class Coordinator: NSObject, PKCanvasViewDelegate {
        @Binding var document: InkDocument
        weak var canvas: AgendaCanvasView?
        var drawing: Bool = true
        var loadedData: String?
        var undoToken = 0
        var clearToken = 0
        var isSaving = false

        private weak var observedCanvas: AgendaCanvasView?
        private var toolPicker: PKToolPicker?
        private var pickerVisible = false

        init(document: Binding<InkDocument>) {
            _document = document
        }

        func attachToolPicker(for canvas: AgendaCanvasView) {
            guard canvas.window != nil else { return }
            let picker = toolPicker ?? PKToolPicker()
            if observedCanvas !== canvas || toolPicker !== picker {
                if let observedCanvas, let toolPicker {
                    toolPicker.setVisible(false, forFirstResponder: observedCanvas)
                    toolPicker.removeObserver(observedCanvas)
                }
                picker.addObserver(canvas)
                observedCanvas = canvas
                toolPicker = picker
            }
            updateToolPickerVisibility(for: canvas)
        }

        func detachToolPicker(for canvas: AgendaCanvasView) {
            guard let observedCanvas else { return }
            if let toolPicker {
                toolPicker.setVisible(false, forFirstResponder: observedCanvas)
                toolPicker.removeObserver(observedCanvas)
            }
            if observedCanvas.isFirstResponder {
                observedCanvas.resignFirstResponder()
            }
            self.observedCanvas = nil
            self.toolPicker = nil
            self.pickerVisible = false
        }

        func updateToolPickerVisibility(for canvas: AgendaCanvasView) {
            guard let picker = toolPicker, canvas.window != nil else { return }
            let shouldBeVisible = drawing
            if pickerVisible != shouldBeVisible {
                pickerVisible = shouldBeVisible
                picker.setVisible(shouldBeVisible, forFirstResponder: canvas)
                DispatchQueue.main.async {
                    guard canvas.window != nil else { return }
                    if shouldBeVisible {
                        if !canvas.isFirstResponder {
                            canvas.becomeFirstResponder()
                        }
                    } else {
                        if canvas.isFirstResponder {
                            canvas.resignFirstResponder()
                        }
                    }
                }
            }
        }

        func load(_ value: InkDocument, into canvas: PKCanvasView) {
            if let encoded = value.pencilKitData,
               let data = Data(base64Encoded: encoded),
               let native = try? PKDrawing(data: data) {
                if canvas.drawing.dataRepresentation() != data {
                    canvas.drawing = native
                }
                loadedData = encoded
                return
            }

            if !value.strokes.isEmpty {
                let converted = PKDrawing(strokes: value.strokes.compactMap(Self.convert))
                if canvas.drawing.dataRepresentation() != converted.dataRepresentation() {
                    canvas.drawing = converted
                }
                save(canvas.drawing)
            } else {
                if !canvas.drawing.strokes.isEmpty {
                    canvas.drawing = PKDrawing()
                }
                loadedData = nil
            }
        }

        private static func convert(_ stroke: InkStroke) -> PKStroke? {
            guard stroke.points.count > 1 else { return nil }
            let strokeWidth = CGFloat(max(0.5, stroke.width))
            let points = stroke.points.enumerated().map { index, point in
                PKStrokePoint(
                    location: CGPoint(x: point.x, y: point.y),
                    timeOffset: TimeInterval(index) / 120.0,
                    size: CGSize(width: strokeWidth, height: strokeWidth),
                    opacity: CGFloat(stroke.opacity ?? 1.0),
                    force: CGFloat(max(0.1, point.p ?? 1.0)),
                    azimuth: 0,
                    altitude: .pi / 2
                )
            }
            let inkColor = UIColor(hex: stroke.color) ?? .label
            let path = PKStrokePath(controlPoints: points, creationDate: .now)
            return PKStroke(ink: PKInk(.pen, color: inkColor), path: path)
        }

        func canvasViewDrawingDidChange(_ canvasView: PKCanvasView) {
            save(canvasView.drawing)
        }

        func save(_ drawing: PKDrawing) {
            isSaving = true
            if drawing.strokes.isEmpty {
                loadedData = nil
                Task { @MainActor [weak self] in
                    guard let self else { return }
                    if self.document.pencilKitData != nil || !self.document.strokes.isEmpty {
                        self.document.pencilKitData = nil
                        self.document.strokes = []
                    }
                    self.isSaving = false
                }
            } else {
                let encoded = drawing.dataRepresentation().base64EncodedString()
                loadedData = encoded
                Task { @MainActor [weak self] in
                    guard let self else { return }
                    if self.document.pencilKitData != encoded {
                        self.document.pencilKitData = encoded
                    }
                    self.isSaving = false
                }
            }
        }
    }
}

private extension UIColor {
    convenience init?(hex: String) {
        let raw = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        guard raw.count == 6, let value = UInt64(raw, radix: 16) else { return nil }
        self.init(
            red: CGFloat((value >> 16) & 255) / 255.0,
            green: CGFloat((value >> 8) & 255) / 255.0,
            blue: CGFloat(value & 255) / 255.0,
            alpha: 1.0
        )
    }
}
