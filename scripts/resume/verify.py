from pathlib import Path
import pymupdf

root = Path(__file__).resolve().parents[2]
approved = root / 'content/resume/ataimo-edem-resume-approved.pdf'
public = root / 'public/resume/ataimo-edem-resume.pdf'
assert approved.read_bytes() == public.read_bytes(), 'Public resume differs from the approved PDF'
with pymupdf.open(public) as document:
    assert len(document) == 2, 'Resume must retain two pages'
    headline = document[0]
    targets = {
        'LinkedIn': 'https://linkedin.com/in/ataimo-edem-4780b8160',
        'GitHub': 'https://github.com/Ataimo007',
        'admin@ataimo.com': 'mailto:admin@ataimo.com',
        'ataimo.com': 'https://ataimo.com/',
    }
    for label, expected in targets.items():
        words = [pymupdf.Rect(word[:4]) for word in headline.get_text('words')
                 if word[4] == label and word[1] < 100]
        assert len(words) == 1, f'Headline label missing or repeated: {label}'
        links = [link for link in headline.get_links()
                 if link['from'].intersects(words[0])]
        assert len(links) == 1 and links[0].get('uri') == expected, f'Wrong hyperlink for {label}: expected {expected}'
    assert 'edemataimo@gmail.com' not in headline.get_text().split('EXECUTIVE PROFILE')[0]
    education = document[1].get_text()
    assert 'Minna, Niger State, Nigeria | 2012 - 2018' in education
    assert 'Minna, Nigeria | 2012 - 2018' not in education
    for word in document[1].get_text('words'):
        if 514 < word[1] < 524 and word[0] > 400:
            assert word[2] < 586, 'Education location overflows its grid column'
print('Approved/public PDF parity, headline link targets and geometry, contact privacy, education location and grid fit verified.')
