from playwright.sync_api import sync_playwright
BASE="http://localhost:12000/warung-go-digital/app/"
MODUL=["dasbor","warung","transaksi","rating","katalog","promosi","foto","laporan"]
LEBAR=[320,360,390,414,600,768,900,1024,1280,1440,1920]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/chromium",args=["--no-sandbox"])
    leak=[]
    for w in LEBAR:
        pg=b.new_page(viewport={"width":w,"height":900})
        for m in MODUL:
            pg.goto(BASE,wait_until="load"); pg.wait_for_timeout(300)
            pg.evaluate(f"location.hash='#/{m}'"); pg.wait_for_timeout(450)
            r=pg.evaluate("()=>({sw:document.documentElement.scrollWidth,iw:window.innerWidth})")
            if r["sw"]>r["iw"]: leak.append(f"{w}px #{m}: {r['sw']}>{r['iw']}")
        pg.close()
    print("LEAK:" if leak else "Tidak ada overflow di semua ukuran layar.")
    for l in leak: print("  ",l)
    b.close()
