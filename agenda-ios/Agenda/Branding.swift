import SwiftUI

struct AgendaLogo: View {
    var size: CGFloat = 32

    var body: some View {
        Image("AgendaLogo")
            .resizable()
            .renderingMode(.template)
            .scaledToFit()
            .foregroundStyle(.primary)
            .frame(width: size, height: size)
            .accessibilityLabel("Agenda")
    }
}

private struct NativeScrollEdgeModifier: ViewModifier {
    func body(content: Content) -> some View {
        if #available(iOS 26.0, *) {
            content.scrollEdgeEffectStyle(.soft, for: .top)
        } else {
            content
                .toolbarBackground(.automatic, for: .navigationBar)
                .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
        }
    }
}

private struct AgendaOnChangeModifier<Value: Equatable>: ViewModifier {
    let value: Value
    let action: (Value) -> Void
    @State private var hasObservedInitialValue = false

    func body(content: Content) -> some View {
        content.task(id: value) {
            guard hasObservedInitialValue else {
                hasObservedInitialValue = true
                return
            }
            action(value)
        }
    }
}

extension View {
    func nativeScrollEdge() -> some View { modifier(NativeScrollEdgeModifier()) }

    /// Runs only after an Equatable value changes, on iOS 16.4 and later.
    func agendaOnChange<Value: Equatable>(of value: Value, perform action: @escaping (Value) -> Void) -> some View {
        modifier(AgendaOnChangeModifier(value: value, action: action))
    }
}
