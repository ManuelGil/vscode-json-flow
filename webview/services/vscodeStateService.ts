import { getVscodeApi } from '../getVscodeApi';

export const vscodeStateService = {
  saveState(state: any) {
    const vscode = getVscodeApi();
    vscode.setState(state);
  },
  getState() {
    const vscode = getVscodeApi();
    return vscode.getState();
  },
};
