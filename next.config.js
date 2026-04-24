/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 画像を外部ドメインから表示するため unoptimized (プレビュー用途のため)
  images: { unoptimized: true },
  // Google Fonts を <link> で読み込んでいるため、ビルド時の最適化はオフ
  optimizeFonts: false,
};

module.exports = nextConfig;
