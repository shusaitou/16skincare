import { describe, expect, it } from 'vitest'
import {
  DEFAULT_COSMETICS_GENRE_ID,
  buildRakutenUrl,
  cleanProductName,
  fromOpenBeautyFacts,
  fromRakuten,
  inferCategory,
  isValidJan,
} from '../lib/productLookup'
import { allProductCategories } from '../lib/substitution'

describe('cleanProductName', () => {
  it('販促の括弧書きを取り除く', () => {
    expect(cleanProductName('【送料無料】ハトムギ化粧水 500ml')).toBe('ハトムギ化粧水 500ml')
    expect(cleanProductName('(あす楽)ニベア青缶')).toBe('ニベア青缶')
  })

  it('記号ノイズを取り除く', () => {
    expect(cleanProductName('★人気★ リップティント')).toBe('人気 リップティント')
  })

  it('連続する空白を1つにまとめる', () => {
    expect(cleanProductName('化粧水    高保湿')).toBe('化粧水 高保湿')
  })

  it('普通の商品名はそのまま', () => {
    expect(cleanProductName('化粧水・敏感肌用 高保湿タイプ')).toBe('化粧水・敏感肌用 高保湿タイプ')
  })

  it('空文字でも壊れない', () => {
    expect(cleanProductName('')).toBe('')
  })
})

describe('inferCategory', () => {
  it('基本的なカテゴリを当てる', () => {
    expect(inferCategory('ハトムギ化粧水')).toBe('化粧水')
    expect(inferCategory('乳液・敏感肌用')).toBe('乳液')
    expect(inferCategory('パーフェクトホイップ 洗顔フォーム')).toBe('洗顔料')
    expect(inferCategory('リップティント N')).toBe('リップ')
    expect(inferCategory('ロング&カールマスカラ')).toBe('マスカラ')
  })

  it('「化粧下地」を「化粧水」と取り違えない（具体的なルールが先）', () => {
    expect(inferCategory('皮脂くずれ防止 化粧下地')).toBe('化粧下地')
    expect(inferCategory('メイクアップベース')).toBe('化粧下地')
  })

  it('BB/CC は下地ではなく BB・下地 に寄せる', () => {
    expect(inferCategory('スキンケアBBクリーム')).toBe('BB・下地')
    expect(inferCategory('CCクリーム ナチュラル')).toBe('BB・下地')
  })

  it('日焼け止めを他のカテゴリより優先する', () => {
    // 「UVミルク」は乳液(ミルク)とも読めるが、UV を優先する
    expect(inferCategory('UVカット ミルク SPF50')).toBe('日焼け止め')
    expect(inferCategory('サンスクリーンクリーム')).toBe('日焼け止め')
  })

  it('クリームより先に具体的なカテゴリを当てる', () => {
    expect(inferCategory('BBクリーム')).toBe('BB・下地')
    expect(inferCategory('保湿クリーム')).toBe('保湿クリーム')
  })

  it('当てられなければ undefined', () => {
    expect(inferCategory('謎のなにか')).toBeUndefined()
    expect(inferCategory('')).toBeUndefined()
  })

  it('推定結果は必ずアプリで扱えるカテゴリになる', () => {
    const valid = new Set(allProductCategories())
    const samples = [
      'ハトムギ化粧水', '乳液', '洗顔フォーム', 'BBクリーム', '化粧下地',
      'ファンデーション', 'コンシーラー', 'フェイスパウダー', 'アイブロウペンシル',
      'アイシャドウパレット', 'リキッドアイライナー', 'マスカラ', 'クリームチーク',
      'リップティント', 'ハイライター', 'シェーディングパウダー', '日焼け止め',
      '保湿クリーム', 'アフターシェーブローション',
    ]
    for (const s of samples) {
      const c = inferCategory(s)
      expect(c, `${s} → ${c}`).toBeDefined()
      expect(valid.has(c!), `${s} → ${c} はアプリ外のカテゴリ`).toBe(true)
    }
  })

  it('販促文字が付いていても推定できる', () => {
    expect(inferCategory('【送料無料】ハトムギ化粧水 500ml')).toBe('化粧水')
  })
})

describe('buildRakutenUrl', () => {
  it('現行のエンドポイント（openapi.rakuten.co.jp）を使う', () => {
    // 旧 app.rakuten.co.jp は現在発行される資格情報を受け付けない
    const url = new URL(buildRakutenUrl('APPID', { keyword: 'x' }))
    expect(url.host).toBe('openapi.rakuten.co.jp')
    expect(url.pathname).toContain('IchibaItem/Search')
  })

  // ジャンル制限の付け忘れ（= コスメ以外の商品が候補に出る）を防ぐためのテスト。
  // 実際に JAN 照会側で付け忘れていたので、ここで固定する。
  it('必ず化粧品ジャンルに絞る', () => {
    const url = new URL(buildRakutenUrl('APPID', { keyword: 'ハトムギ' }))
    expect(url.searchParams.get('genreId')).toBe(DEFAULT_COSMETICS_GENRE_ID)
  })

  it('JAN をキーワードにする場合もジャンル制限が付く', () => {
    const url = new URL(buildRakutenUrl('APPID', { keyword: '4987241167012', hits: 5 }))
    expect(url.searchParams.get('genreId')).toBe(DEFAULT_COSMETICS_GENRE_ID)
    expect(url.searchParams.get('keyword')).toBe('4987241167012')
    expect(url.searchParams.get('hits')).toBe('5')
  })

  it('ジャンルIDを環境変数などで上書きできる', () => {
    const url = new URL(buildRakutenUrl('APPID', { keyword: 'x', genreId: '123456' }))
    expect(url.searchParams.get('genreId')).toBe('123456')
  })

  it('空文字の上書きは既定値に落とす（誤って全ジャンルにしない）', () => {
    const url = new URL(buildRakutenUrl('APPID', { keyword: 'x', genreId: '' }))
    expect(url.searchParams.get('genreId')).toBe(DEFAULT_COSMETICS_GENRE_ID)
  })

  it('accessKey を渡すとクエリに載る（現在の楽天は2つの値が必要）', () => {
    const url = new URL(buildRakutenUrl('APPID', { keyword: 'x', accessKey: 'pk_test123' }))
    expect(url.searchParams.get('applicationId')).toBe('APPID')
    expect(url.searchParams.get('accessKey')).toBe('pk_test123')
  })

  it('accessKey が無ければクエリに載せない（未設定でも壊さない）', () => {
    const url = new URL(buildRakutenUrl('APPID', { keyword: 'x' }))
    expect(url.searchParams.has('accessKey')).toBe(false)
  })

  it('アプリIDとキーワードを正しくエスケープする', () => {
    const url = new URL(buildRakutenUrl('APP&ID', { keyword: '化粧水 &' }))
    expect(url.searchParams.get('applicationId')).toBe('APP&ID')
    expect(url.searchParams.get('keyword')).toBe('化粧水 &')
    expect(url.searchParams.get('format')).toBe('json')
  })
})

describe('fromRakuten', () => {
  it('商品名を整形して返す', () => {
    const r = fromRakuten({
      Items: [{ Item: { itemName: '【送料無料】ハトムギ化粧水 500ml', shopName: '楽天の店' } }],
    })
    expect(r).toHaveLength(1)
    expect(r[0].name).toBe('ハトムギ化粧水 500ml')
    expect(r[0].category).toBe('化粧水')
    expect(r[0].source).toBe('rakuten')
  })

  it('店名をブランドとして扱わない（誤情報になるため）', () => {
    const r = fromRakuten({ Items: [{ Item: { itemName: '化粧水', shopName: 'コスメ通販A店' } }] })
    expect(r[0].brand).toBeUndefined()
  })

  it('整形後に同じ名前になったものは1件にまとめる', () => {
    const r = fromRakuten({
      Items: [
        { Item: { itemName: '【送料無料】ニベア青缶' } },
        { Item: { itemName: '★ニベア青缶' } },
      ],
    })
    expect(r).toHaveLength(1)
  })

  it('件数を制限できる', () => {
    const Items = Array.from({ length: 20 }, (_, i) => ({ Item: { itemName: `化粧水${i}` } }))
    expect(fromRakuten({ Items }, 5)).toHaveLength(5)
  })

  it('空・欠損レスポンスでも壊れない', () => {
    expect(fromRakuten({})).toEqual([])
    expect(fromRakuten({ Items: [] })).toEqual([])
    expect(fromRakuten({ Items: [{ Item: {} }] })).toEqual([])
  })
})

describe('fromOpenBeautyFacts', () => {
  it('JAN 照会の結果を整形する（実データの形）', () => {
    const r = fromOpenBeautyFacts({
      status: 1,
      product: {
        code: '4987241167012',
        product_name: '肌ラボ　極潤プレミアム',
        brands: 'ロート製薬, 肌ラボ',
      },
    })
    expect(r).not.toBeNull()
    expect(r!.jan).toBe('4987241167012')
    // 全角スペースは半角に正規化される（検索・表示の揺れを減らすため）
    expect(r!.name).toBe('肌ラボ 極潤プレミアム')
    // メーカーではなくブランドを採る
    expect(r!.brand).toBe('肌ラボ')
    expect(r!.source).toBe('openbeautyfacts')
  })

  it('日本語名があれば優先する', () => {
    const r = fromOpenBeautyFacts({
      status: 1,
      product: { code: '1', product_name: 'Hada Labo', product_name_ja: '肌ラボ' },
    })
    expect(r!.name).toBe('肌ラボ')
  })

  it('見つからなければ null', () => {
    expect(fromOpenBeautyFacts({ status: 0 })).toBeNull()
    expect(fromOpenBeautyFacts({})).toBeNull()
  })

  it('商品名が空なら null（登録だけあって中身が無いケース）', () => {
    expect(fromOpenBeautyFacts({ status: 1, product: { code: '1', product_name: '' } })).toBeNull()
  })

  it('ブランド未登録でも壊れない', () => {
    const r = fromOpenBeautyFacts({ status: 1, product: { code: '1', product_name: '化粧水' } })
    expect(r!.brand).toBeUndefined()
  })
})

describe('isValidJan', () => {
  it('実在する JAN を受理する', () => {
    // Open Beauty Facts で実際に引けた肌ラボの JAN
    expect(isValidJan('4987241167012')).toBe(true)
  })

  it('チェックディジットが違えば弾く', () => {
    expect(isValidJan('4987241167013')).toBe(false)
  })

  it('桁数が違えば弾く', () => {
    expect(isValidJan('123')).toBe(false)
    expect(isValidJan('12345678901234')).toBe(false)
  })

  it('数字以外が混ざっていても桁が合えば判定する', () => {
    expect(isValidJan('4987-2411-67012')).toBe(true)
  })

  it('空文字は弾く', () => {
    expect(isValidJan('')).toBe(false)
  })
})
