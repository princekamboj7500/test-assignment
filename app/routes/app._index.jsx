import { useState, useCallback } from "react";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation, useSubmit } from "@remix-run/react";
import {
  Page,
  LegacyCard,
  Tabs,
  Text,
  Button,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);

  const shop = session.shop
  const apiAccessToken = session.accessToken;
  // TODO: Complete this function to fetch the assets from the Shopify API
  // and return the home, product, and collection templates.
  const assets = await admin.rest.resources.Asset.all({ session, theme_id: 129160871988 });

  const templates = assets.data.filter((asset) => {
    return asset.key?.includes('templates/');
  });
  return json({ templates: templates });
};

export let action = async ({ request, params }) => {
  const { session, admin } = await authenticate.admin(request);

  const shop = session.shop
  const apiAccessToken = session.accessToken;
  // TODO: Complete this function to duplicate the selected asset
  // by creating a new asset with a random key and the same content.
  // format should be if homepage then index.{random10-characters-key}.liquid, collection then collection.{random10-characters-key}.liquid, product then product.{random10-characters-key}.liquid
  const body = await request.formData();
  const key = body.get('key');
  const alternate = key.split('.');
  if(alternate.length>2){
    alternate[1] = new Date().getTime();
  }else{
    alternate[2]=alternate[1];
    alternate[1] = new Date().getTime();
  }
  console.log(key);
  const newKey = alternate.join('.');
  console.log(newKey)
  console.log(session)
  try{
    /** this api not exit with latest api version */
    // const asset = new admin.rest.resources.Asset({ session: session });
    // asset.theme_id = 129160871988;
    // asset.key = newKey;
    // asset.source_key = key;
    // await asset.save({
    //   update: true,
    // });
    var myHeaders = new Headers();
    myHeaders.append("X-Shopify-Access-Token", session.accessToken);
    myHeaders.append("Content-Type", "application/json");

    var raw = JSON.stringify({
      "asset": {
        "key": newKey,
        "source_key": key
      }
    });

    var requestOptions = {
      method: 'PUT',
      headers: myHeaders,
      body: raw,
      redirect: 'follow'
    };

    const req = await fetch("https://"+session.shop+"/admin/api/2023-01/themes/129160871988/assets.json", requestOptions);
    const res = await req.json();
    return json({ status: 'success', data: res.asset });
  }catch(e){
    console.log("error", e.body)
    return json({ status: 'error'});
  }
};

export default function Index() {
  const submit = useSubmit();
  const [selected, setSelected] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState(false);
  const { templates } = useLoaderData();
  const actionData = useActionData();

  const nav = useNavigation();
  const isLoading = nav.state === "submitting";

  if(actionData){
    if(!templates.find(as => as.key == actionData.data.key)){
      templates.push(actionData.data);
    }
  }

  const handleTabChange = useCallback(
    (selectedTabIndex) => { setSelected(selectedTabIndex); setSelectedAsset(false) },
    [],
  );

  const tabs = [
    {
      id: 'home',
      content: 'Home Page',
      panelID: 'homepage',
      assets: templates.filter((f) => { return f.key.includes("templates/index.") })
    },
    {
      id: 'collection',
      content: 'Collection Page',
      panelID: 'collection-page',
      assets: templates.filter((f) => { return f.key.includes("templates/collection.") })
    },
    {
      id: 'product',
      content: 'Product Page',
      panelID: 'product-page',
      assets: templates.filter((f) => { return f.key.includes("templates/product.") })
    },
  ];

  const onSelection = (e, key) => {
    document.querySelectorAll('.template_assets').forEach((e) => e.style.borderColor = "#ccc");
    setSelectedAsset(key);
    e.currentTarget.style.borderColor = "green";
    e.currentTarget.classList.add('selected');
  }

  const duplicate = async() => {
    submit({ key: selectedAsset }, { replace: true, method: "POST" });
  }

  return (
    <Page narrowWidth>
      <ui-title-bar title="Remix app template"></ui-title-bar>
      <LegacyCard>
        <Tabs tabs={tabs} selected={selected} onSelect={handleTabChange}>
          <LegacyCard.Section>
            {tabs[selected].assets.length ?
              tabs[selected].assets.map((asset) => (
                <div className="template_assets" style={{ border: "1px solid #ccc", boxShadow: "0px 1px 2px 0px #cccccc", padding: "15px", marginBottom: "10px" }} onClick={(e) => onSelection(e, asset.key)}>
                  <Text as="h2">Asset key: {asset.key}</Text>
                  <Text as="h2">Theme ID: {asset.theme_id}</Text>
                  <Text as="h2">Updated At: {asset.updated_at}</Text>
                </div>
              ))
              : <p>Empty</p>}
            <Button primary disabled={!selectedAsset} onClick={duplicate} loading={isLoading}>Duplicate Template</Button>
          </LegacyCard.Section>
        </Tabs>
      </LegacyCard>
    </Page>
  );

}
