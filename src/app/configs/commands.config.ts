/**
 * Command identifiers for the extension.
 * These are the short IDs without the extension ID prefix.
 */
export enum CommandIds {
  ChangeWorkspace = 'changeWorkspace',

  // Files commands
  FilesOpenFile = 'files.openFile',
  FilesCopyContent = 'files.copyContent',
  FilesCopyContentAsJson = 'files.copyContentAsJson',
  FilesCopyContentPartialAsJson = 'files.copyContentPartialAsJson',
  FilesGetFileProperties = 'files.getFileProperties',
  FilesConvertToJson = 'files.convertToJson',
  FilesConvertPartialToJson = 'files.convertPartialToJson',
  FilesConvertToType = 'files.convertToType',
  FilesConvertPartialToType = 'files.convertPartialToType',
  FilesRefreshList = 'files.refreshList',

  // JSON commands
  JsonShowPreview = 'json.showPreview',
  JsonShowPartialPreview = 'json.showPartialPreview',
  JsonFetchJsonData = 'json.fetchJsonData',

  // View commands
  ViewEnableSplitView = 'view.enableSplitView',
  ViewDisableSplitView = 'view.disableSplitView',
  ViewEnableLiveSync = 'view.enableLiveSync',
  ViewDisableLiveSync = 'view.disableLiveSync',

  // Feedback commands
  FeedbackAboutUs = 'feedback.aboutUs',
  FeedbackReportIssues = 'feedback.reportIssues',
  FeedbackRateUs = 'feedback.rateUs',
}
