// Load — Run Web Apps on iPad
// Copyright (c) 2026 LBond. All Rights Reserved.
//
// Project model. One Project per imported web app. The `folderName`
// is the name of the on-disk directory inside the app's Documents
// folder that holds the web app's files. `entryFile` is the relative
// path to the HTML file the WebView should load.

import Foundation

struct Project: Identifiable, Codable, Equatable {
    let id: UUID
    var name: String
    var entryFile: String
    var folderName: String
    var lastOpened: Date?
    var dateAdded: Date

    init(id: UUID = UUID(),
         name: String,
         entryFile: String,
         folderName: String,
         lastOpened: Date? = nil,
         dateAdded: Date = Date()) {
        self.id = id
        self.name = name
        self.entryFile = entryFile
        self.folderName = folderName
        self.lastOpened = lastOpened
        self.dateAdded = dateAdded
    }
}
