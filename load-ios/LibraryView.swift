// Load — Run Web Apps on iPad
// Copyright (c) 2026 LBond. All Rights Reserved.
//
// Library grid. Part 1: layout + empty state only; the + button and
// project tiles are wired to no-ops. Part 2 adds file import and
// persistence so projects actually show up.

import SwiftUI

struct LibraryView: View {
    @State private var projects: [Project] = []

    private let columns = [
        GridItem(.adaptive(minimum: 180), spacing: 20)
    ]

    var body: some View {
        NavigationStack {
            ZStack {
                Color(red: 0.10, green: 0.10, blue: 0.18).ignoresSafeArea()

                if projects.isEmpty {
                    emptyState
                } else {
                    grid
                }
            }
            .navigationTitle("Load")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        // Part 2 will wire this to a file-import picker.
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title2)
                    }
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 18) {
            Image(systemName: "square.stack.3d.up")
                .font(.system(size: 60))
                .foregroundStyle(.gray.opacity(0.6))
            Text("No projects yet")
                .font(.title2.weight(.semibold))
            Text("Tap + to import a web app folder or HTML file")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding()
    }

    private var grid: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 20) {
                ForEach(projects) { project in
                    ProjectTile(project: project)
                }
            }
            .padding()
        }
    }
}

struct ProjectTile: View {
    let project: Project

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            RoundedRectangle(cornerRadius: 16)
                .fill(LinearGradient(colors: [
                    Color(red: 0.28, green: 0.28, blue: 0.67),
                    Color(red: 0.17, green: 0.17, blue: 0.35)
                ], startPoint: .topLeading, endPoint: .bottomTrailing))
                .aspectRatio(1, contentMode: .fit)
                .overlay(
                    Image(systemName: "doc.richtext")
                        .font(.system(size: 36))
                        .foregroundStyle(.white.opacity(0.85))
                )

            Text(project.name)
                .font(.headline)
                .lineLimit(1)

            if let date = project.lastOpened {
                Text("Last opened \(date, style: .relative) ago")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                Text("Never opened")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

#Preview {
    LibraryView()
}
