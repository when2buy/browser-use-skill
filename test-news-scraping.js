#!/usr/bin/env node

/**
 * Test scraping latest news from multiple sources
 */

const { BrowserUse } = require('browser-use-sdk');

async function scrapeNews(site, task) {
  const client = new BrowserUse({ 
    apiKey: process.env.BROWSER_USE_API_KEY 
  });
  
  console.log(`\n📰 Scraping: ${site}`);
  console.log(`Task: ${task}\n`);
  
  try {
    const result = await client.tasks.create({ task });
    
    console.log(`✅ Task created (ID: ${result.id})`);
    console.log('⏳ Waiting for completion...\n');
    
    // Poll for result
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      
      const status = await client.tasks.retrieve(result.id);
      
      if (status.status === 'finished') {
        console.log('📊 Result:');
        console.log('─'.repeat(60));
        console.log(status.output);
        console.log('─'.repeat(60));
        console.log(`⏱️  Duration: ${((new Date(status.finishedAt) - new Date(status.startedAt))/1000).toFixed(1)}s`);
        console.log(`💰 Cost: $${status.cost}`);
        return status.output;
      } else if (status.status === 'failed') {
        console.log('❌ Task failed:', status.error);
        return null;
      }
      
      process.stdout.write('.');
    }
    
    console.log('\n⏱️  Timeout waiting for task');
    return null;
    
  } catch (err) {
    console.log('❌ Error:', err.message);
    return null;
  }
}

async function main() {
  console.log('🧪 Testing News Scraping - Verify Latest Content\n');
  console.log('═'.repeat(60));
  
  // Test 1: Hacker News (tech news)
  await scrapeNews(
    'Hacker News',
    'Go to news.ycombinator.com and get the top 5 story titles with their points. Include the posting time/date for each story.'
  );
  
  // Test 2: TechCrunch (tech news)
  await scrapeNews(
    'TechCrunch',
    'Go to techcrunch.com and get the 3 latest article headlines with their publication dates.'
  );
  
  // Test 3: BBC News (general news)
  await scrapeNews(
    'BBC News',
    'Go to bbc.com/news and get the top 3 headline stories with their publication times.'
  );
  
  console.log('\n✅ All news scraping tests completed!');
  console.log('\n💡 Verification: Check if the news dates/times are recent (today or yesterday)');
}

main();
