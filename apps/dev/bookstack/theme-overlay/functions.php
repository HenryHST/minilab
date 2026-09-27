<?php

use BookStack\Facades\Theme;
use BookStack\Theming\ThemeEvents;
use BookStack\Theming\ThemeViews;

/**
 * Inject PDF font CSS for dompdf exports (Noto Sans from storage/fonts/dompdf).
 * Synced onto the custom theme by theme-modules-sync Job.
 */
Theme::listen(ThemeEvents::THEME_REGISTER_VIEWS, function (ThemeViews $themeViews) {
    $themeViews->renderBefore('layouts.parts.base-body-start', 'pdf-fonts-head', 30);
});
