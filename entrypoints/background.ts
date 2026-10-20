import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';

export default defineBackground(() => {
  // Register synchronously so Chrome can wake the worker for installation.
  browser.runtime.onInstalled.addListener(() => {
    console.info('Streak Maintaining App installed or updated.');
  });
});
