// Load — Run Web Apps on iPad
// Copyright (c) 2026 LBond. All Rights Reserved.
//
// Root view. Kept thin on purpose — routes to LibraryView for now,
// and later parts can swap in a different container (tabs, split
// view) without touching the app entry.

import SwiftUI

struct ContentView: View {
    var body: some View {
        LibraryView()
    }
}

#Preview {
    ContentView()
}
