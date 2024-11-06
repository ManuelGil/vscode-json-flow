import { Uri, env } from 'vscode';

import { EXTENSION_BUGS_URL, EXTENSION_MARKETPLACE_URL } from '../configs';

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
  // Constructor
  // -----------------------------------------------------------------

  /**
   * Constructor for the FeedbackController class.
   *
   * @constructor
   * @public
   * @memberof FeedbackController
   */
  constructor() {}

  // -----------------------------------------------------------------
  // Methods
  // -----------------------------------------------------------------

  // Public methods
  /**
   * The reportIssues method.
   *
   * @function reportIssues
   * @public
   * @memberof FeedbackController
   *
   * @returns {void} - No return value
   */
  reportIssues(): void {
    env.openExternal(Uri.parse(EXTENSION_BUGS_URL));
  }

  /**
   * The rateUs method.
   *
   * @function rateUs
   * @public
   * @memberof FeedbackController
   *
   * @returns {void} - No return value
   */
  rateUs(): void {
    env.openExternal(
      Uri.parse(`${EXTENSION_MARKETPLACE_URL}&ssr=false#review-details`),
    );
  }
}
