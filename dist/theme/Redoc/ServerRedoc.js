"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const clsx_1 = __importDefault(require("clsx"));
require("../../global");
const redoc_1 = require("redoc");
const useSpec_1 = require("../../utils/useSpec");
const useBrokenLinks_1 = __importDefault(require("@docusaurus/useBrokenLinks"));
const Styles_1 = require("./Styles");
require("./styles.css");
/*!
 * Redocusaurus
 * https://redocusaurus.vercel.app/
 * (c) 2024 Rohit Gohri
 * Released under the MIT License
 */
function ServerRedoc(props) {
    const { className, optionsOverrides, ...specProps } = props;
    const { store, darkThemeOptions, lightThemeOptions, hasLogo } = (0, useSpec_1.useSpec)(specProps, optionsOverrides);
    const collector = (0, useBrokenLinks_1.default)();
    collectMenuItemAnchors(collector, store.menu.items);
    return (react_1.default.createElement(react_1.default.Fragment, null,
        react_1.default.createElement(Styles_1.ServerStyles, { specProps: specProps, lightThemeOptions: lightThemeOptions, darkThemeOptions: darkThemeOptions }),
        react_1.default.createElement("div", { className: (0, clsx_1.default)([
                'redocusaurus',
                hasLogo && 'redocusaurus-has-logo',
                className,
            ]) },
            react_1.default.createElement(redoc_1.Redoc, { store: store }))));
}
function collectMenuItemAnchors(collector, menuItems, parentAnchor = "") {
    menuItems.forEach((menuItem) => {
        // Register anchor for menu item
        collector.collectAnchor(menuItem.id);
        // If this is a child menu item, register a shortened anchor as well
        // This may not be necessary in all cases, but definitely needed for
        // menuItems of the form `tag/<Tag ID>/operation/<Operation ID>`.
        if (parentAnchor != "") {
            const childAnchor = menuItem.id.replace(`${parentAnchor}/`, "");
            collector.collectAnchor(childAnchor);
        }
        if (menuItem.items.length > 0) {
            collectMenuItemAnchors(collector, menuItem.items, menuItem.id);
        }
    });
}
exports.default = ServerRedoc;
//# sourceMappingURL=ServerRedoc.js.map