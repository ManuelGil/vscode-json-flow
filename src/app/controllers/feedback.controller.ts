import { Uri, env } from 'vscode';

import {
  EXTENSION_BUGS_URL,
  EXTENSION_MARKETPLACE_URL,
  EXTENSION_WEBSITE_URL,
} from '../configs';

/**
 * The FeedbackController class.
 *
 * @class
 * @classdesc The class that represents the feedback controller.
 * @export
 * @public
 * @example
 * const controller = new FeedbackController();
 */
export class FeedbackController {
  // -----------------------------------------------------------------
  // Methods
  // -----------------------------------------------------------------

  // Public methods
  /**
   * Opens the extension's marketplace page in the browser.
   */
  aboutUs(): void {
    env.openExternal(Uri.parse(EXTENSION_WEBSITE_URL));
  }

  /**
   * Opens the extension's repository issues page in the browser.
   */
  reportIssues(): void {
    env.openExternal(Uri.parse(EXTENSION_BUGS_URL));
  }

  /**
   * Opens the review page for the extension in the marketplace.
   */
  rateUs(): void {
    env.openExternal(
      Uri.parse(`${EXTENSION_MARKETPLACE_URL}&ssr=false#review-details`),
    );
  }
}
