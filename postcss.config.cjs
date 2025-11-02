module.exports = {
  plugins: [
    require('@fullhuman/postcss-purgecss')({
      content: [
        './Views/**/*.cshtml',
        './wwwroot/js/**/*.js'
      ],
      defaultExtractor: content => content.match(/[^\s"'`><:=\/\[\]\(\)\{\}]+/g) || [],
      safelist: {
        standard: [
          // dropdowns and inline panels
          /^(dropdown|enhanced-dropdown|inline-left-from-(focus|user|network))/,
          // activity/timer blocks
          /^(activity|timer|progress-ring)/,
          // nav and layout wrappers
          /^(top-nav|left-nav|right-nav|nav-btn|user-btn|main-content|left-side|right-side|doc-box|content-text)/,
          // notifications
          /^(notification|notifications|notification-badge)/,
          // classes/network blocks
          /^(network|friend|classes|cls)-/,
          // bootstrap state classes commonly toggled
          /^(show|active)$/
        ]
      }
    }),
    require('cssnano')({ preset: 'default' })
  ]
};
