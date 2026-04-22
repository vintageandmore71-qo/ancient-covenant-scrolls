// Load — Run Web Apps on iPad
// Copyright (c) 2026 DssOrit. All Rights Reserved.
//
// App entry point. Sets the app-wide dark theme and brand accent color
// so every screen inherits the look without repeating it per-view.

import SwiftUI

@main
struct LoadApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .preferredColorScheme(.dark)
                .tint(Color(red: 0.49, green: 0.49, blue: 1.0))
        }
    }
}
