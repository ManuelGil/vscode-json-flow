import { Uri, env } from 'vscode';

import {
  EXTENSION_BUGS_URL,
  EXTENSION_MARKETPLACE_URL,
  EXTENSION_WEBSITE_URL,
} from '../configs';

/**
 * Handles feedback actions such as opening the extension website, reporting bugs, and rating the extension.
 */
export class FeedbackController {
  // -----------------------------------------------------------------
  // Methods
  // -----------------------------------------------------------------

  /**
   * Opens the extension's website in the default browser for user feedback or information.
   */
  async aboutUs(): Promise<void> {
    env.openExternal(Uri.parse(EXTENSION_WEBSITE_URL));
  }

  /**
   * Opens the extension's repository issues page in the browser, allowing users to report bugs or request features.
   */
  async reportIssues(): Promise<void> {
    env.openExternal(Uri.parse(EXTENSION_BUGS_URL));
  }

  /**
   * Opens the review page for the extension in the marketplace, enabling users to rate and provide feedback.
   */
  async rateUs(): Promise<void> {
    env.openExternal(
      Uri.parse(`${EXTENSION_MARKETPLACE_URL}&ssr=false#review-details`),
    );
  }
}
