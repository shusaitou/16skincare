module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // コスメ誌エディトリアル風の暖色ニュートラルパレット
        cream: '#FAF6F1',
        ivory: '#FFFFFF',
        ink: '#2B2622',
        muted: '#8A8178',
        line: '#E7DED4',
        accent: '#B5806A',
        'accent-soft': '#EFE3DC'
      },
      fontFamily: {
        // 見出し用の明朝（和欧混植）
        serif: [
          'Georgia',
          '"Times New Roman"',
          '"Hiragino Mincho ProN"',
          '"Yu Mincho"',
          'YuMincho',
          'serif'
        ]
      }
    }
  },
  plugins: []
}
